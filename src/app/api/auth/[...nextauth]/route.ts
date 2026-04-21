import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import { createSession, decrypt } from "@/lib/session";
import { masterDb, getTenantDb } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid profile email https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/business.manage",
        },
      },
    }),
    {
      ...GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        authorization: {
          params: {
            prompt: "select_account",
            access_type: "online",
            response_type: "code",
            scope: "openid profile email",
          },
        },
      }),
      id: "google-login",
      name: "Google (Login)",
    },
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || account.provider !== "google-login") return true;

      const email =
        typeof profile?.email === "string" ? profile.email.toLowerCase().trim() : "";
      if (!email) return "/login?error=no_email";

      // Search for this email across all tenant databases (incl. HQ).
      const allTenants = await masterDb.tenant.findMany({
        select: { id: true, databaseName: true },
      });
      allTenants.push({ id: "ROOT-HQ", databaseName: "omnicore_hq" } as any);

      let matchedUser: { publicId: string; role: string; email: string } | null = null;
      let matchedTenantId: string | null = null;
      let matchedDatabaseName: string | null = null;

      for (const t of allTenants) {
        try {
          const db = await getTenantDb(t.databaseName);
          const found = await db.user.findFirst({
            where: { email, deletedAt: null },
            select: { publicId: true, role: true, email: true },
          });
          if (found) {
            matchedUser = found;
            matchedTenantId = t.id;
            matchedDatabaseName = t.databaseName;
            break;
          }
        } catch {
          // Tenant DB unreachable - skip
        }
      }

      if (!matchedUser || !matchedTenantId || !matchedDatabaseName) {
        const params = new URLSearchParams({ error: "no_account", hint: email });
        return `/login?${params}`;
      }

      // Enforce per-tenant Google login gate (HQ bypass).
      if (matchedTenantId !== "ROOT-HQ") {
        const integration = await masterDb.tenantGoogleIntegration.findUnique({
          where: { tenantId: matchedTenantId },
          select: { loginEnabled: true },
        });
        if (integration && !integration.loginEnabled) {
          return "/login?error=google_disabled";
        }
      }

      await createSession({
        userId: matchedUser.publicId,
        tenantId: matchedTenantId,
        databaseName: matchedDatabaseName,
        role: matchedUser.role,
        email: matchedUser.email,
      });

      return matchedUser.role === "SUPER_ADMIN"
        ? "/super-admin"
        : matchedUser.role === "TENANT_ADMIN" || matchedUser.role === "STAFF"
          ? "/dashboard"
          : "/portal";
    },
    async jwt({ token, account, profile }) {
      if (account && account.provider === "google") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.googleAccountId = account.providerAccountId;
        token.expiresAt = account.expires_at;

        try {
          const cookieStore = await cookies();
          const targetTenantCookie = cookieStore.get('google_target_tenant')?.value;
          const sessionToken =
            cookieStore.get('nixvra_session')?.value ??
            cookieStore.get('omnicore_session')?.value;

          let omniSession = null;
          if (sessionToken) {
            try {
              omniSession = await decrypt(sessionToken);
            } catch (e) {
              console.error("JWT Callback: Failed to decrypt session cookie", e);
            }
          }

          const finalTenantId = targetTenantCookie || omniSession?.tenantId;
          const email = profile?.email || token?.email as string || 'unknown@google.com';
          const googleAccountId = account?.providerAccountId || profile?.sub || token?.sub as string || `fallback-${Date.now()}`;

          if (finalTenantId && finalTenantId !== 'ROOT-HQ' && account.access_token) {
            // ── Step 1: Remove stale integration for THIS tenant (allows switching Google accounts)
            await masterDb.tenantGoogleIntegration.deleteMany({
              where: { tenantId: finalTenantId, NOT: { googleAccountId } },
            });

            // ── Step 2: Upsert TenantGoogleIntegration by googleAccountId safely
            const tokenExpiry = account.expires_at
              ? new Date(account.expires_at * 1000)
              : new Date(Date.now() + 3600 * 1000);

            try {
              await masterDb.tenantGoogleIntegration.upsert({
                where: { googleAccountId },
                create: { tenantId: finalTenantId, googleAccountId, email, accessToken: account.access_token, refreshToken: account.refresh_token || '', tokenExpiry },
                update: { tenantId: finalTenantId, email, accessToken: account.access_token, ...(account.refresh_token ? { refreshToken: account.refresh_token } : {}), tokenExpiry },
              });
            } catch (upsertError: any) {
              // Ignore unique constraint errors caused by NextAuth parallel JWT requests
              if (upsertError.code !== 'P2002') {
                throw upsertError;
              }
            }

            // ── Step 3: Find the tenant and update the matching user record
            // Update: sync email to the Google email, mark emailVerified=true, save googleId.
            // This is the KEY FIX — the user's DB email is updated to match their Google account,
            // so future Google logins will find them correctly regardless of original DB email.
            try {
              const tenant = await masterDb.tenant.findUnique({
                where: { id: finalTenantId },
                select: { databaseName: true },
              });
              if (tenant) {
                const db = await getTenantDb(tenant.databaseName);
                const userId = omniSession?.userId;

                if (userId) {
                  // Update specifically the connected user by their session userId
                  await db.$executeRawUnsafe(
                    `UPDATE users SET email = ?, emailVerified = TRUE, googleId = ?, updatedAt = NOW() WHERE publicId = ?`,
                    email, googleAccountId, userId
                  );
                } else {
                  // Fallback: update any TENANT_ADMIN if no session (shouldn't normally happen)
                  await db.$executeRawUnsafe(
                    `UPDATE users SET email = ?, emailVerified = TRUE, googleId = ?, updatedAt = NOW() WHERE role = 'TENANT_ADMIN' LIMIT 1`,
                    email, googleAccountId
                  );
                }
                console.log(`[Google Connect] Updated user email to ${email} and marked verified for tenant ${finalTenantId}`);
              }
            } catch (updateErr) {
              console.error('[Google Connect] Failed to sync user email/verified status:', updateErr);
            }

            if (targetTenantCookie) {
              cookieStore.delete('google_target_tenant');
            }
          }
        } catch (e) {
          console.error("Failed to persist Google Token in JWT callback:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken as string;
      // @ts-ignore
      session.refreshToken = token.refreshToken as string;
      // @ts-ignore
      session.googleAccountId = token.googleAccountId as string;
      return session;
    },
  },
  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
