'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mail, Briefcase, FolderOpen, Users, BarChart2, LayoutDashboard, Handshake } from 'lucide-react'

const ITEMS = [
  { href: '/inbox',      icon: Mail,            label: 'Mail' },
  { href: '/workbench',  icon: Briefcase,       label: 'Workbench' },
  { href: '/cases',      icon: FolderOpen,      label: 'Cases' },
  { href: '/crm',        icon: Users,           label: 'CRM' },
  { href: '/reports',    icon: BarChart2,       label: 'Reports' },
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/operations', icon: Handshake,       label: 'Operations' },
] as const

const EMAIL_ROUTES = ['/inbox', '/sent', '/starred', '/drafts', '/spam', '/bin', '/archive']

export default function AppRail() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/inbox')
      return EMAIL_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
    if (href === '/workbench')
      return pathname === '/workbench' || pathname.startsWith('/workbench/') || pathname.startsWith('/cases/')
    if (href === '/cases')
      return pathname === '/cases'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="es-app-rail">
      {ITEMS.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} aria-label={label} className={isActive(href) ? 'active' : ''}>
          <Icon size={16} strokeWidth={1.5} />
        </Link>
      ))}
      <div className="spacer" />
    </div>
  )
}
