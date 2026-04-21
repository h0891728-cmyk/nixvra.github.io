import type { Metadata } from 'next'
import { getTenantPublicData } from '@/actions/public-ingestion'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ domain: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params
  const tenant = await getTenantPublicData(domain)
  if (!tenant) return { title: 'Not Found' }

  const seoTitle = tenant.landingPage?.seoTitle ?? `${tenant.name} - ${tenant.tagline ?? 'Welcome'}`
  const seoDescription = tenant.landingPage?.seoDescription ?? tenant.tagline ?? `Official page of ${tenant.name}`

  return {
    title: seoTitle,
    description: seoDescription,
  }
}

export default async function PublicTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params
  const tenant = await getTenantPublicData(domain)
  if (!tenant) notFound()

  const primary = tenant.primaryColor ?? '#00B077'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --primary: ${primary};
            --primary-10: ${primary}18;
            --primary-30: ${primary}50;
            --bg: #ffffff;
            --bg-card: #ffffff;
            --bg-raised: #f8f9fc;
            --border: rgba(0,0,0,0.08);
            --text-primary: #111111;
            --text-muted: rgba(17,17,17,0.5);
            --text-secondary: rgba(17,17,17,0.72);
            --radius: 16px;
          }
          html, body { 
            font-family: 'Inter', 'Outfit', sans-serif;
            background: var(--bg);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
          }
          .btn-primary {
            background: var(--primary);
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 0.75rem 1.5rem;
            font-weight: 700;
            font-size: 0.9375rem;
            cursor: pointer;
            transition: opacity 180ms, transform 180ms;
          }
          .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
          .form-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #fff;
            border: 1.5px solid var(--border);
            border-radius: 10px;
            color: var(--text-primary);
            font-family: inherit;
            font-size: 0.9375rem;
            transition: border-color 180ms;
            outline: none;
          }
          .form-input:focus { border-color: var(--primary); }
          .form-input::placeholder { color: var(--text-muted); }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
