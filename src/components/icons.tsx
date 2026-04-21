import React from 'react'

export type IconProps = React.SVGProps<SVGSVGElement>

const SVG = ({ children, width = 20, height = 20, ...props }: IconProps & { children: React.ReactNode }) => (
  <svg 
    viewBox="0 0 24 24" fill="none" stroke="currentColor" 
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" 
    width={width} height={height}
    {...props}
  >
    {children}
  </svg>
)

export const GridIcon = (p: IconProps) => <SVG {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></SVG>
export const BuildingIcon = (p: IconProps) => <SVG {...p}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></SVG>
export const UsersIcon = (p: IconProps) => <SVG {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></SVG>
export const PersonIcon = (p: IconProps) => <SVG {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></SVG>
export const GlobeIcon = (p: IconProps) => <SVG {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></SVG>
export const LinkIcon = (p: IconProps) => <SVG {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></SVG>
export const PlugIcon = (p: IconProps) => <SVG {...p}><path d="M18 6 6 18M7 6v4l-4 4 3 3 4-4h4l6-6-3-3z"/></SVG>
export const HomeIcon = (p: IconProps) => <SVG {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></SVG>
export const CreditCardIcon = (p: IconProps) => <SVG {...p}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></SVG>
export const AnalyticsIcon = (p: IconProps) => <SVG {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></SVG>
export const ActivityIcon = (p: IconProps) => <SVG {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></SVG>

export const CheckIcon = (p: IconProps) => <SVG {...p}><polyline points="20 6 9 17 4 12"/></SVG>
export const CrossIcon = (p: IconProps) => <SVG {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></SVG>
export const AlertIcon = (p: IconProps) => <SVG {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></SVG>
export const ClockIcon = (p: IconProps) => <SVG {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></SVG>
export const BlockIcon = (p: IconProps) => <SVG {...p}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></SVG>

export const ShieldIcon = (p: IconProps) => <SVG {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></SVG>
export const RefreshIcon = (p: IconProps) => <SVG {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></SVG>
export const MegaphoneIcon = (p: IconProps) => <SVG {...p}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></SVG>
export const TrashIcon = (p: IconProps) => <SVG {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></SVG>
export const SearchIcon = (p: IconProps) => <SVG {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></SVG>
export const EditIcon = (p: IconProps) => <SVG {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></SVG>
export const PlusIcon = (p: IconProps) => <SVG {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></SVG>
export const StarIcon = (p: IconProps) => <SVG {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></SVG>
export const CalendarIcon = (p: IconProps) => <SVG {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></SVG>

export const DatabaseIcon = (p: IconProps) => <SVG {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></SVG>
export const ZapIcon = (p: IconProps) => <SVG {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></SVG>
export const BriefcaseIcon = (p: IconProps) => <SVG {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></SVG>
export const CodeIcon = (p: IconProps) => <SVG {...p}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></SVG>

export const ShoppingCartIcon = (p: IconProps) => <SVG {...p}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></SVG>
export const MessageCircleIcon = (p: IconProps) => <SVG {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></SVG>
export const YoutubeIcon = (p: IconProps) => <SVG {...p}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></SVG>

export const MailIcon = (p: IconProps) => <SVG {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></SVG>
export const CloudIcon = (p: IconProps) => <SVG {...p}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></SVG>
export const LockIcon = (p: IconProps) => <SVG {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></SVG>
export const UnlockIcon = (p: IconProps) => <SVG {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></SVG>
