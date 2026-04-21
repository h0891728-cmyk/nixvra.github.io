export type TenantServiceCard = {
  key: string
  label: string
  description: string
  icon: string
  route?: string
  category: 'operations' | 'growth' | 'communications'
  isModuleKey?: boolean
  requiresModule?: string
}

export const TENANT_SERVICE_CARDS: TenantServiceCard[] = [
  {
    key: 'CRM',
    label: 'CRM',
    description: 'Polymorphic modules, profiles, timelines, and relationship records.',
    icon: 'view_module',
    route: '/dashboard/modules',
    category: 'operations',
    isModuleKey: true,
  },
  {
    key: 'BILLING',
    label: 'ERP',
    description: 'Invoices, payroll, expenses, and financial operations.',
    icon: 'account_balance',
    route: '/dashboard/payroll',
    category: 'operations',
    isModuleKey: true,
  },
  {
    key: 'SOCIAL',
    label: 'Social Media Hub',
    description: 'Publishing, social history sync, and channel analytics.',
    icon: 'forum',
    route: '/dashboard/marketing',
    category: 'growth',
    isModuleKey: true,
  },
  {
    key: 'ADS',
    label: 'Marketing',
    description: 'Campaign creation, lead flows, and audience outreach.',
    icon: 'campaign',
    route: '/dashboard/marketing',
    category: 'growth',
    isModuleKey: true,
  },
  {
    key: 'CHAT',
    label: 'Chat Module',
    description: 'WhatsApp-style tenant messaging, direct chat, and broadcasts.',
    icon: 'chat',
    route: '/dashboard/chat',
    category: 'communications',
    requiresModule: 'SOCIAL',
  },
  {
    key: 'YOUTUBE',
    label: 'YouTube Module',
    description: 'YouTube operations inside the social workspace.',
    icon: 'smart_display',
    route: '/dashboard/settings/social-marketing',
    category: 'growth',
    requiresModule: 'SOCIAL',
  },
]

export const SOCIAL_AUTOMATION_CARDS: TenantServiceCard[] = [
  {
    key: 'SOCIAL_AUTO_SYNC',
    label: 'Historical Sync Automation',
    description: 'Keep social history and campaign metrics synced into the tenant workspace.',
    icon: 'sync',
    category: 'growth',
    requiresModule: 'SOCIAL',
  },
  {
    key: 'LEAD_AUTOMATION',
    label: 'Lead Campaign Automation',
    description: 'Auto-enable lead outreach workflows for connected campaigns and channels.',
    icon: 'bolt',
    category: 'growth',
    requiresModule: 'ADS',
  },
  {
    key: 'DATA_SHARING',
    label: 'Channel Data Sharing',
    description: 'Share connected channel activity across marketing, CRM, and chat flows.',
    icon: 'share',
    category: 'communications',
    requiresModule: 'SOCIAL',
  },
]
