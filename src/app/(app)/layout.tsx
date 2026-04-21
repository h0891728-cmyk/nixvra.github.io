import type { Metadata, Viewport } from 'next'
import '../globals.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { getSession } from '@/lib/session'
import ImpersonationBanner from '@/components/ImpersonationBanner'

export const metadata: Metadata = {
  title: {
    default: 'Nixvra - Omnichannel SaaS Platform',
    template: '%s | Nixvra',
  },
  description: 'The polymorphic multi-tenant engine for complete operational control.',
  icons: { icon: '/favicon.ico' },
  authors: [{ name: 'Nixvra' }],
  keywords: ['SaaS', 'CRM', 'Marketing Automation', 'Ad Campaigns', 'WhatsApp', 'Agency'],
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00B077',
}

export default async function AppRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Unbounded:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="light" forcedTheme="light" enableSystem={false}>
          {session?.impersonatorId && (
            <ImpersonationBanner userName={session.email} />
          )}
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
