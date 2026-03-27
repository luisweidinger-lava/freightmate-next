'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Inbox, Send, Star, FileText, AlertOctagon, Trash2,
  LayoutDashboard, FolderOpen, Users, BarChart2,
  Package, ChevronDown, ChevronRight, Briefcase,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const EMAIL_LINKS = [
  { href: '/inbox',   label: 'Inbox',   icon: Inbox,        badge: 'inbox'   },
  { href: '/starred', label: 'Starred',  icon: Star,         badge: null      },
  { href: '/drafts',  label: 'Drafts',   icon: FileText,     badge: 'drafts'  },
  { href: '/sent',    label: 'Sent',     icon: Send,         badge: null      },
  { href: '/spam',    label: 'Spam',     icon: AlertOctagon, badge: null      },
  { href: '/bin',     label: 'Bin',      icon: Trash2,       badge: null      },
]

const OPERATIONS_LINKS = [
  { href: '/workbench', label: 'Workbench',      icon: Briefcase       },
  { href: '/dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
  { href: '/cases',     label: 'All Cases',      icon: FolderOpen      },
  { href: '/crm',       label: 'CRM & Contacts', icon: Users           },
  { href: '/reports',   label: 'Reports',        icon: BarChart2       },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [emailOpen,      setEmailOpen]      = useState(true)
  const [unreadCount,    setUnreadCount]    = useState(0)
  const [draftCount,     setDraftCount]     = useState(0)
  const [unmatchedCount, setUnmatchedCount] = useState(0)

  async function fetchCounts() {
    const [unreadRes, draftsRes, unmatchedRes] = await Promise.all([
      supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('folder', 'inbox'),
      supabase
        .from('message_drafts')
        .select('*', { count: 'exact', head: true })
        .is('approved_at', null)
        .is('rejected_at', null)
        .is('sent_at', null),
      supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .is('case_id', null)
        .eq('folder', 'inbox'),
    ])
    setUnreadCount(unreadRes.count   ?? 0)
    setDraftCount(draftsRes.count    ?? 0)
    setUnmatchedCount(unmatchedRes.count ?? 0)
  }

  useEffect(() => {
    fetchCounts()
    const channel = supabase
      .channel('sidebar-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages' },  fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_drafts' }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Workbench is active on /workbench and on any /cases/[ref] route
  const workbenchActive = (href: string) =>
    href === '/workbench'
      ? pathname === '/workbench' || (pathname.startsWith('/cases/') && pathname !== '/cases')
      : pathname === href || (href !== '/cases' && pathname.startsWith(href + '/'))

  return (
    <aside
      className="flex flex-col h-screen w-56 flex-shrink-0"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <Package size={20} className="text-blue-400" />
        <span className="font-semibold text-white tracking-wide text-sm">AxisLog</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">

        {/* Email section */}
        <div>
          <button
            onClick={() => setEmailOpen(o => !o)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span>Email</span>
            {emailOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {emailOpen && (
            <div className="mt-1 space-y-0.5">
              {EMAIL_LINKS.map(({ href, label, icon: Icon, badge }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                const count  = badge === 'inbox' ? unreadCount : badge === 'drafts' ? draftCount : 0
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon size={15} />
                      {label}
                    </span>
                    {count > 0 && (
                      <span className={cn(
                        'text-xs rounded-full px-1.5 py-0.5 leading-none text-white',
                        badge === 'drafts' ? 'bg-purple-500' : 'bg-blue-500'
                      )}>
                        {count}
                      </span>
                    )}
                  </Link>
                )
              })}

              {/* Unmatched alert */}
              {unmatchedCount > 0 && (
                <Link
                  href="/inbox?filter=unmatched"
                  className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-md text-sm text-amber-400 hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <AlertOctagon size={15} />
                    Unmatched
                  </span>
                  <span className="text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                    {unmatchedCount}
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Operations section */}
        <div>
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Operations
          </p>
          <div className="mt-1 space-y-0.5">
            {OPERATIONS_LINKS.map(({ href, label, icon: Icon }) => {
              const active = workbenchActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
            SC
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">Coordinator</p>
            <p className="text-xs text-slate-500 truncate">Online</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
