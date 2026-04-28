'use client'

import Link from 'next/link'
<<<<<<< HEAD
import { usePathname } from 'next/navigation'
import { Mail, Briefcase, FolderOpen, Users, BarChart2, LayoutDashboard, Handshake } from 'lucide-react'
=======
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Mail, Briefcase, FolderOpen, Users, BarChart2, LayoutDashboard, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
>>>>>>> 239a6f325a31326ffe742a7ab6c01f01bea9f74b

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
  const router   = useRouter()

  const [user, setUser]     = useState<{ email?: string; user_metadata?: { full_name?: string; name?: string } } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  // Close menu on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/onboarding/login')
  }

  function isActive(href: string) {
    if (href === '/inbox')
      return EMAIL_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
    if (href === '/workbench')
      return pathname === '/workbench' || pathname.startsWith('/workbench/') || pathname.startsWith('/cases/')
    if (href === '/cases')
      return pathname === '/cases'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || null
  const email       = user?.email ?? ''
  const initials    = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase()

  return (
    <div className="es-app-rail" style={{ position: 'relative' }}>
      {ITEMS.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} aria-label={label} className={isActive(href) ? 'active' : ''}>
          <Icon size={16} strokeWidth={1.5} />
        </Link>
      ))}

      <div className="spacer" />

      {/* Online status dot */}
      <span className="es-status-dot" style={{ margin: '0 auto 4px' }} />

      {/* User identity widget */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          aria-label="Account menu"
          onClick={() => setMenuOpen(o => !o)}
          title={displayName ? `${displayName}\n${email}` : email}
          style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#5B4EE8', color: 'white',
            border: '2px solid rgba(91,78,232,0.3)',
            display: 'grid', placeItems: 'center',
            fontSize: '10px', fontWeight: 700, fontFamily: 'Figtree, sans-serif',
            cursor: 'pointer', flexShrink: 0,
            transition: 'border-color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(91,78,232,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(91,78,232,0.3)')}
        >
          {initials || '?'}
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', bottom: '0', left: 'calc(100% + 8px)',
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '200px', zIndex: 100, overflow: 'hidden',
          }}>
            {/* User info */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6' }}>
              {displayName && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                  {displayName}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '10px 14px', border: 'none',
                background: 'none', cursor: 'pointer', fontSize: '12px', color: '#374151',
                fontFamily: 'Figtree, sans-serif',
                transition: 'background 120ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={13} strokeWidth={1.5} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
