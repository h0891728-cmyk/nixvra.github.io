import { getTenantPublicData } from '@/actions/public-ingestion'
import { notFound } from 'next/navigation'
import EduTemplate from './_components/EduTemplate'
import ClinicTemplate from './_components/ClinicTemplate'
import RealEstateTemplate from './_components/RealEstateTemplate'
import GenericTemplate from './_components/GenericTemplate'

interface Props {
  params: Promise<{ domain: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Re-fetch public data every 60s

export default async function PublicTenantPage({ params }: Props) {
  const { domain } = await params
  const tenant = await getTenantPublicData(domain)

  if (!tenant) notFound()

  // Route to the right template based on industry
  switch (tenant.industry) {
    case 'EDUCATION':
      return <EduTemplate tenant={tenant} />
    case 'HEALTHCARE':
      return <ClinicTemplate tenant={tenant} />
    case 'REAL_ESTATE':
      return <RealEstateTemplate tenant={tenant} />
    default:
      return <GenericTemplate tenant={tenant} />
  }
}
