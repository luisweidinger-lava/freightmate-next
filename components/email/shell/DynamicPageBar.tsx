'use client'

import { usePathname } from 'next/navigation'

const TITLE_MAP: Record<string, string> = {
  '/inbox':   'Inbox',
  '/starred': 'Starred',
  '/drafts':  'Drafts',
  '/sent':    'Sent',
  '/bin':     'Bin',
  '/spam':    'Spam',
  '/archive': 'Archive',
  '/cases':   'Cases',
  '/dashboard': 'Dashboard',
  '/operations': 'Operations',
  '/workbench': 'Workbench',
  '/crm':     'CRM',
  '/reports': 'Reports',
}

export default function DynamicPageBar() {
  const pathname = usePathname()

  // For /cases/[ref] workbench pages show "Workbench"
  const title =
    TITLE_MAP[pathname] ??
    (pathname.startsWith('/cases/') ? 'Workbench' : null)

  if (!title) return null

  return (
    <div className="es-page-bar">
      <span className="es-page-bar-title">{title}</span>
    </div>
  )
}
