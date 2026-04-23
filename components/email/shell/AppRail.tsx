'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mail, Briefcase, LayoutDashboard, Users, BarChart2, Settings } from 'lucide-react'

const ITEMS = [
  { href: '/inbox',     icon: Mail,            label: 'Mail' },
  { href: '/cases',     icon: Briefcase,       label: 'Cases' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/crm',       icon: Users,           label: 'CRM' },
  { href: '/reports',   icon: BarChart2,       label: 'Reports' },
] as const

const EMAIL_ROUTES = ['/inbox', '/sent', '/starred', '/drafts', '/spam', '/bin']

export default function AppRail() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/inbox') return EMAIL_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="es-app-rail">
      {ITEMS.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} title={label} style={{ display: 'contents' }}>
          <button className={isActive(href) ? 'active' : ''}>
            <Icon size={16} strokeWidth={1.5} />
          </button>
        </Link>
      ))}
      <div className="spacer" />
      <button title="Settings"><Settings size={16} strokeWidth={1.5} /></button>
    </div>
  )
}
