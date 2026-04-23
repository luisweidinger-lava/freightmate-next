'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronDown, ChevronRight, Inbox, Star, FileText, Send,
  Trash2, AlertOctagon, Archive, AlertTriangle, Briefcase, Globe, Plus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface Counts {
  inbox: number; drafts: number; urgent: number
  unmatched: number; fromClients: number; fromVendors: number
}

interface CtxMenu { x: number; y: number; href: string; label: string }

// ── Default favourites (shown before any localStorage data) ──────────────────

const DEFAULT_FAVS: { href: string; label: string }[] = [
  { href: '/inbox',   label: 'Inbox'   },
  { href: '/starred', label: 'Starred' },
  { href: '/drafts',  label: 'Drafts'  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadFavs(): string[] {
  try {
    const raw = localStorage.getItem('fm_favourites')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return DEFAULT_FAVS.map(f => f.href)
}

function saveFavs(hrefs: string[]) {
  localStorage.setItem('fm_favourites', JSON.stringify(hrefs))
}

// Map href → label for dynamic favourites display
const LABEL_MAP: Record<string, string> = {
  '/inbox':                    'Inbox',
  '/starred':                  'Starred',
  '/drafts':                   'Drafts',
  '/sent':                     'Sent Items',
  '/bin':                      'Deleted',
  '/spam':                     'Junk Email',
  '/archive':                  'Archive',
  '/inbox?filter=unmatched':   'Unmatched',
  '/inbox?filter=client':      'From clients',
  '/inbox?filter=vendor':      'From vendors',
}

// ── RailLink ─────────────────────────────────────────────────────────────────

interface RailLinkProps {
  href: string
  icon: React.ElementType
  label: string
  count?: number
  alert?: boolean
  onCtxMenu: (e: React.MouseEvent, href: string, label: string) => void
}

function RailLink({ href, icon: Icon, label, count, alert, onCtxMenu }: RailLinkProps) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  let active: boolean
  if (href.includes('?')) {
    const [hrefPath, hrefQuery] = href.split('?')
    if (pathname !== hrefPath) {
      active = false
    } else {
      const hrefParams = new URLSearchParams(hrefQuery)
      active = [...hrefParams.entries()].every(([k, v]) => searchParams.get(k) === v)
    }
  } else {
    active = pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <Link href={href}>
      <div
        className={`es-rail-link${active ? ' active' : ''}${alert && (count ?? 0) > 0 ? ' alert' : ''}`}
        onContextMenu={e => { e.preventDefault(); onCtxMenu(e, href, label) }}
      >
        <Icon size={13} className="es-rl-icon" strokeWidth={1.5} />
        <span>{label}</span>
        {(count !== undefined && count > 0) && (
          <span className="es-rl-count">{count}</span>
        )}
      </div>
    </Link>
  )
}

// ── Group ────────────────────────────────────────────────────────────────────

function Group({ label, open, onToggle, children }: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="es-rail-group">
      <div className="es-rail-group-header" onClick={onToggle}>
        {open
          ? <ChevronDown  size={11} style={{ color: 'var(--es-n-400)' }} />
          : <ChevronRight size={11} style={{ color: 'var(--es-n-400)' }} />}
        {label}
      </div>
      {open && children}
    </div>
  )
}

// ── FolderRail ───────────────────────────────────────────────────────────────

export default function FolderRail() {
  const [counts,   setCounts]   = useState<Counts>({ inbox: 0, drafts: 0, urgent: 0, unmatched: 0, fromClients: 0, fromVendors: 0 })
  const [favOpen,  setFavOpen]  = useState(true)
  const [acctOpen, setAcctOpen] = useState(true)
  const [viewOpen, setViewOpen] = useState(true)
  const [width,    setWidth]    = useState(220)
  const [favs,     setFavs]     = useState<string[]>([])
  const [ctx,      setCtx]      = useState<CtxMenu | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)

  // Load favourites from localStorage on mount
  useEffect(() => { setFavs(loadFavs()) }, [])

  // Close context menu on outside click
  useEffect(() => {
    if (!ctx) return
    function onDown(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtx(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [ctx])

  // Supabase realtime counts
  const fetchCounts = useCallback(async () => {
    const [unreadRes, draftsRes, unmatchedRes, clientRes, vendorRes] = await Promise.all([
      // Unread inbox
      supabase.from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false).eq('folder', 'inbox'),
      // Pending drafts
      supabase.from('message_drafts')
        .select('*', { count: 'exact', head: true })
        .is('approved_at', null).is('rejected_at', null).is('sent_at', null),
      // Unmatched: inbox emails with no case linked
      supabase.from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('folder', 'inbox').is('case_id', null),
      // From clients: inbox emails linked to a client channel (inner join required)
      (supabase.from('email_messages') as any)
        .select('case_channels!channel_id!inner(channel_type)', { count: 'exact', head: true })
        .eq('folder', 'inbox')
        .eq('case_channels.channel_type', 'client'),
      // From vendors: inbox emails linked to a vendor channel (inner join required)
      (supabase.from('email_messages') as any)
        .select('case_channels!channel_id!inner(channel_type)', { count: 'exact', head: true })
        .eq('folder', 'inbox')
        .eq('case_channels.channel_type', 'vendor'),
    ])
    setCounts({
      inbox:       unreadRes.count    ?? 0,
      drafts:      draftsRes.count    ?? 0,
      urgent:      0,                          // reserved — no urgency field yet
      unmatched:   unmatchedRes.count ?? 0,
      fromClients: clientRes.count    ?? 0,
      fromVendors: vendorRes.count    ?? 0,
    })
  }, [])

  useEffect(() => {
    fetchCounts()
    const channel = supabase
      .channel('folder-rail-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_drafts' }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchCounts])

  // ── Drag to resize ─────────────────────────────────────────────────────────

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startX     = e.clientX
    const startWidth = width
    function onMove(ev: MouseEvent) {
      setWidth(Math.max(160, Math.min(400, startWidth + ev.clientX - startX)))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Favourites management ──────────────────────────────────────────────────

  function openCtx(e: React.MouseEvent, href: string, label: string) {
    setCtx({ x: e.clientX, y: e.clientY, href, label })
  }

  function addFav(href: string) {
    const next = favs.includes(href) ? favs : [...favs, href]
    setFavs(next); saveFavs(next); setCtx(null)
  }

  function removeFav(href: string) {
    const next = favs.filter(h => h !== href)
    setFavs(next); saveFavs(next); setCtx(null)
  }

  // Build favourite RailLinks (with count lookup)
  function countFor(href: string): number | undefined {
    if (href === '/inbox')                   return counts.inbox || undefined
    if (href === '/drafts')                  return counts.drafts || undefined
    if (href === '/inbox?filter=unmatched')  return counts.unmatched || undefined
    if (href === '/inbox?filter=client')     return counts.fromClients || undefined
    if (href === '/inbox?filter=vendor')     return counts.fromVendors || undefined
    return undefined
  }

  return (
    <div className="es-folder-rail" style={{ width, position: 'relative', flexShrink: 0 }}>
      <div className="es-folder-rail-scroll">

        {/* ── Favourites (dynamic) ── */}
        <Group label="Favourites" open={favOpen} onToggle={() => setFavOpen(o => !o)}>
          {favs.map(href => {
            const label = LABEL_MAP[href] ?? href
            return (
              <RailLink
                key={href}
                href={href}
                icon={Inbox}
                label={label}
                count={countFor(href)}
                onCtxMenu={openCtx}
              />
            )
          })}
        </Group>

        {/* ── Account ── */}
        <Group label="freightmate58@gmail.com" open={acctOpen} onToggle={() => setAcctOpen(o => !o)}>
          <RailLink href="/inbox"   icon={Inbox}        label="Inbox"      count={counts.inbox}  onCtxMenu={openCtx} />
          <RailLink href="/drafts"  icon={FileText}     label="Drafts"     count={counts.drafts} onCtxMenu={openCtx} />
          <RailLink href="/sent"    icon={Send}         label="Sent Items"                       onCtxMenu={openCtx} />
          <RailLink href="/bin"     icon={Trash2}       label="Deleted"                          onCtxMenu={openCtx} />
          <RailLink href="/spam"    icon={AlertOctagon} label="Junk Email"                       onCtxMenu={openCtx} />
          <RailLink href="/archive" icon={Archive}      label="Archive"                          onCtxMenu={openCtx} />
        </Group>

        {/* ── Smart views ── */}
        <Group label="Smart views" open={viewOpen} onToggle={() => setViewOpen(o => !o)}>
          <RailLink href="/inbox?filter=unmatched" icon={AlertTriangle} label="Unmatched"    count={counts.unmatched}   alert onCtxMenu={openCtx} />
          <RailLink href="/inbox?filter=client"    icon={Briefcase}     label="From clients" count={counts.fromClients}       onCtxMenu={openCtx} />
          <RailLink href="/inbox?filter=vendor"    icon={Globe}         label="From vendors" count={counts.fromVendors}       onCtxMenu={openCtx} />
        </Group>

        <div style={{ padding: '8px 12px', color: 'var(--es-brand)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} /> Add account
        </div>
      </div>

      {/* ── User status ── */}
      <div className="es-user-status">
        <span className="es-status-dot" />
        <span>Coordinator</span>
      </div>

      {/* ── Drag handle ── */}
      <div className="es-drag-handle" onMouseDown={startDrag} />

      {/* ── Context menu ── */}
      {ctx && (
        <div
          ref={ctxRef}
          className="es-ctx-menu"
          style={{ top: ctx.y, left: ctx.x }}
        >
          {favs.includes(ctx.href) ? (
            <button onClick={() => removeFav(ctx.href)}>Remove from Favourites</button>
          ) : (
            <button onClick={() => addFav(ctx.href)}>Add to Favourites</button>
          )}
        </div>
      )}
    </div>
  )
}
