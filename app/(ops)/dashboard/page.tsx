// DASHBOARD FILTERS — this page only PUSHES, never reads URL params
// Pushes to /cases with these params:
// ?filter=delayed   → pre-filter to isDelayed cases
// ?filter=critical  → pre-filter to isCritical cases
// ?filter=silent    → pre-filter to isGoneSilent cases
// ?stage=<key>      → pre-filter to pipeline stage
// ?period=today     → pre-filter to today's flights
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package, Clock, AlertTriangle, MessageCircleOff, Plane, TrendingUp,
  Mail, Zap, Filter, X, ArrowRight, AlertCircle, Inbox,
  ChevronDown, Undo2, Redo2, Sparkles, Tag, Printer, MoreHorizontal, Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ROUTES, DASHBOARD_NAV } from '@/lib/routes'
import { formatDateShort, formatRelTime, isSameDay } from '@/lib/utils'
import type { ShipmentCase, EmailMessage, DraftTask } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftWithCase = DraftTask & {
  shipment_cases: { ref_number: string | null; client_name: string | null } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLOSED = ['closed', 'delivered'] as const

const PIPELINE_STAGES = [
  { key: 'quoting',    label: 'Quoting',    statuses: ['new','vendor_requested','quote_received','quote_sent'] },
  { key: 'confirmed',  label: 'Confirmed',  statuses: ['client_confirmed','vendor_confirmed'] },
  { key: 'pickup',     label: 'Pickup',     statuses: ['label_received'] },
  { key: 'booked',     label: 'Booked',     statuses: ['booked'] },
  { key: 'in_transit', label: 'In Transit', statuses: ['in_transit'] },
  { key: 'delivered',  label: 'Delivered',  statuses: ['delivered'] },
] as const

// ── Derived logic ─────────────────────────────────────────────────────────────

const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const isDelayed    = (c: ShipmentCase) => !!c.flight_date && new Date(c.flight_date) < today0() && !CLOSED.includes(c.status as typeof CLOSED[number])
const isCritical   = (c: ShipmentCase) => ['urgent','high'].includes(c.priority) && isDelayed(c)
const isGoneSilent = (c: ShipmentCase) => {
  if (CLOSED.includes(c.status as typeof CLOSED[number])) return false
  if (!c.last_outbound_at) return true
  return Date.now() - new Date(c.last_outbound_at).getTime() > 48 * 3600000
}

// ── useCountUp ────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    let start: number | null = null
    const tick = (ts: number) => {
      if (!start) start = ts
      const p     = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

// ── Zone 0: Flight Alert Bar ──────────────────────────────────────────────────

function FlightAlertBar({ cases, onViewFlights }: { cases: ShipmentCase[]; onViewFlights: () => void }) {
  const t   = today0()
  const tom = new Date(t); tom.setDate(t.getDate() + 1)
  const todayCases    = cases.filter(c => c.flight_date && isSameDay(c.flight_date, t)   && !CLOSED.includes(c.status as typeof CLOSED[number]))
  const tomorrowCases = cases.filter(c => c.flight_date && isSameDay(c.flight_date, tom) && !CLOSED.includes(c.status as typeof CLOSED[number]))
  if (!todayCases.length && !tomorrowCases.length) return null
  const severity = todayCases.length > 0 ? 'red' : 'amber'
  const parts: string[] = []
  if (todayCases.length)    parts.push(`${todayCases.length} shipment${todayCases.length > 1 ? 's' : ''} departing today`)
  if (tomorrowCases.length) parts.push(`${tomorrowCases.length} tomorrow`)
  return (
    <div className={`flight-alert flight-alert--${severity}`}>
      <Plane size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
      <span className="flight-alert__text">{parts.join(' · ')}</span>
      <button className="flight-alert__btn" onClick={onViewFlights}>View cases →</button>
    </div>
  )
}

// ── Zone 1: KPI Strip ─────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, count, variant, onClick }: {
  icon: React.ElementType; label: string; count: number
  variant?: 'red' | 'amber'; onClick: () => void
}) {
  const displayed = useCountUp(count, 700)
  return (
    <button className={`kpi-card${variant ? ` kpi-card--${variant}` : ''}`} onClick={onClick}>
      <div className="kpi-card__top">
        <Icon size={16} strokeWidth={1.5} className="kpi-card__icon" />
      </div>
      <div className="kpi-card__count">{displayed}</div>
      <div className="kpi-card__label">{label}</div>
    </button>
  )
}

function KpiStrip({ active, delayed, critical, silent, crmReview }: {
  active: number; delayed: number; critical: number; silent: number; crmReview: number
}) {
  const router = useRouter()
  return (
    <div className="kpi-strip">
      <KpiCard icon={Package}          label="Active Cases" count={active}     onClick={() => router.push(ROUTES.CASES)} />
      <KpiCard icon={Clock}            label="Delayed"      count={delayed}    onClick={() => router.push(DASHBOARD_NAV.DELAYED)} />
      <KpiCard icon={AlertTriangle}    label="Critical"     count={critical}   variant="red"   onClick={() => router.push(DASHBOARD_NAV.CRITICAL)} />
      <KpiCard icon={MessageCircleOff} label="Gone Silent"  count={silent}     variant="amber" onClick={() => router.push(DASHBOARD_NAV.SILENT)} />
      <KpiCard icon={Users}            label="CRM Review"   count={crmReview}  variant="amber" onClick={() => router.push(`${ROUTES.CRM}?filter=review`)} />
    </div>
  )
}

// ── Zone 2: Status Pipeline ───────────────────────────────────────────────────

function StatusPipeline({ allCases }: { allCases: ShipmentCase[] }) {
  const router = useRouter()
  const counts = Object.fromEntries(
    PIPELINE_STAGES.map(s => [s.key, allCases.filter(c => (s.statuses as readonly string[]).includes(c.status)).length])
  )
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="es-card pipeline-card">
      <div className="es-card__header">
        <TrendingUp size={13} strokeWidth={1.5} />
        <span className="es-card__title">Status Pipeline</span>
        <span className="es-card__subtitle">click to filter</span>
      </div>
      <div className="pipeline-track">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = counts[stage.key]
          const pct   = Math.max(6, Math.round((count / max) * 100))
          return (
            <React.Fragment key={stage.key}>
              <button
                className={`pipeline-node${count === 0 ? ' pipeline-node--empty' : ''}`}
                onClick={() => router.push(DASHBOARD_NAV.STAGE(stage.key))}>
                <span className="pipeline-node__count">{count}</span>
                <span className="pipeline-node__dot-wrap">
                  <span className="pipeline-node__dot" />
                </span>
                <div className="pipeline-node__bar-track">
                  <div className="pipeline-node__bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="pipeline-node__label">{stage.label}</span>
              </button>
              {i < PIPELINE_STAGES.length - 1 && <div className="pipeline-connector" />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ── Zone 3: Needs Action Table ────────────────────────────────────────────────

function NeedsActionTable({ cases, loading }: { cases: ShipmentCase[]; loading: boolean }) {
  const router  = useRouter()
  const active  = cases
    .filter(c => !CLOSED.includes(c.status as typeof CLOSED[number]))
    .sort((a, b) => {
      if (!a.flight_date && !b.flight_date) return 0
      if (!a.flight_date) return 1
      if (!b.flight_date) return -1
      return new Date(a.flight_date).getTime() - new Date(b.flight_date).getTime()
    })
    .slice(0, 8)

  return (
    <div className="es-card">
      <div className="es-card__header">
        <Package size={13} strokeWidth={1.5} />
        <span className="es-card__title">Needs Action</span>
        <span className="es-card__subtitle">{active.length} case{active.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="es-table">
          <thead>
            <tr>
              <th className="th-nosort">Ref</th>
              <th className="th-nosort">Client</th>
              <th className="th-nosort">Route</th>
              <th className="th-nosort">Status</th>
              <th className="th-nosort">Priority</th>
              <th className="th-nosort">Flight Date</th>
              <th className="th-nosort">Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{[56,110,90,80,60,70,70].map((w, j) => (
                    <td key={j} style={{ padding: '9px 12px' }}>
                      <div className="es-skeleton" style={{ height: 11, width: w }} />
                    </td>
                  ))}</tr>
                ))
              : active.length === 0
                ? <tr><td colSpan={7} className="empty-row">No active cases</td></tr>
                : active.map(c => {
                    const delayed  = isDelayed(c)
                    const critical = isCritical(c)
                    const silent   = isGoneSilent(c)
                    return (
                      <tr key={c.id}
                        className={critical ? 'row--critical' : delayed ? 'row--delayed' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(ROUTES.CASE(c.ref_number ?? c.id))}>
                        <td>
                          <span className="cell-ref">{c.ref_number ?? c.case_code}</span>
                          {critical && <AlertTriangle size={11} strokeWidth={1.5} style={{ color: 'var(--es-urgent)', marginLeft: 4, verticalAlign: 'middle' }} />}
                        </td>
                        <td>
                          <div className="cell-client">{c.client_name}</div>
                          <div className="cell-email">{c.client_email}</div>
                        </td>
                        <td>
                          <div className="cell-route">
                            <span>{c.origin ?? '—'}</span>
                            <ArrowRight size={11} strokeWidth={1.5} style={{ color: 'var(--es-n-300)', flexShrink: 0 }} />
                            <span>{c.destination ?? '—'}</span>
                          </div>
                        </td>
                        <td><span className={`es-badge es-badge--${statusVariant(c.status)}`}>{statusLabel(c.status)}</span></td>
                        <td>{priorityBadge(c.priority)}</td>
                        <td>
                          <span className={`cell-date${delayed ? ' cell-date--overdue' : ''}`}>
                            {formatDateShort(c.flight_date)}
                          </span>
                          {delayed && <span className="overdue-tag">late</span>}
                        </td>
                        <td>
                          <span className={`cell-time${silent ? ' cell-time--silent' : ''}`}>
                            {silent && <MessageCircleOff size={11} strokeWidth={1.5} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                            {formatRelTime(c.last_outbound_at)}
                          </span>
                        </td>
                      </tr>
                    )
                  })
            }
          </tbody>
        </table>
      </div>
      {!loading && (
        <div className="table-footer">
          <a className="es-link" style={{ cursor: 'pointer' }} onClick={() => router.push(ROUTES.CASES)}>
            View all cases →
          </a>
        </div>
      )}
    </div>
  )
}

// ── Zone 4L: Unmatched Emails ─────────────────────────────────────────────────

function UnmatchedEmails({ emails, loading }: { emails: EmailMessage[]; loading: boolean }) {
  const router = useRouter()
  const rows   = emails.slice(0, 8)
  return (
    <div className="es-card zone4-card">
      <div className="es-card__header">
        <Mail size={13} strokeWidth={1.5} />
        <span className="es-card__title">Unmatched Emails</span>
        <span className="es-card__subtitle">{emails.length} unlinked</span>
        <div style={{ flex: 1 }} />
        <a className="es-link" style={{ cursor: 'pointer' }} onClick={() => router.push(ROUTES.INBOX_UNMATCHED)}>Link to Case →</a>
      </div>
      <div className="email-list">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="email-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  <div className="es-skeleton" style={{ height: 11, width: 130 }} />
                  <div className="es-skeleton" style={{ height: 11, width: '80%' }} />
                </div>
                <div className="es-skeleton" style={{ height: 11, width: 38, flexShrink: 0 }} />
              </div>
            ))
          : rows.length === 0
            ? <div className="empty-state"><Inbox size={20} strokeWidth={1.5} /><span>No unmatched emails</span></div>
            : rows.map(e => (
                <div key={e.id} className="email-row" onClick={() => router.push(ROUTES.INBOX_UNMATCHED)}>
                  <div className="email-row__body">
                    <div className="email-row__sender">{e.sender_email}</div>
                    <div className="email-row__subject">{(e.subject ?? '').length > 60 ? (e.subject ?? '').slice(0, 60) + '…' : (e.subject ?? '(no subject)')}</div>
                  </div>
                  <div className="email-row__time">{formatRelTime(e.created_at)}</div>
                </div>
              ))
        }
        {!loading && emails.length > 8 && (
          <div className="list-footer">
            <a className="es-link" style={{ cursor: 'pointer' }} onClick={() => router.push(ROUTES.INBOX_UNMATCHED)}>
              +{emails.length - 8} more →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Zone 4R: AI Drafts Ready ──────────────────────────────────────────────────

function AiDrafts({ drafts, loading }: { drafts: DraftWithCase[]; loading: boolean }) {
  const router  = useRouter()
  const oldest  = drafts.length ? drafts.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b) : null
  const pressure = drafts.length === 0 ? 'green' : drafts.length <= 3 ? 'amber' : 'red'
  const colors   = { green: 'var(--es-ok)', amber: 'var(--es-high)', red: 'var(--es-urgent)' }

  return (
    <div className="es-card zone4-card">
      <div className="es-card__header">
        <Zap size={13} strokeWidth={1.5} />
        <span className="es-card__title">AI Drafts Ready</span>
        <div style={{ flex: 1 }} />
      </div>
      <div className="drafts-pressure" style={{ color: colors[pressure] }}>
        {drafts.length === 0
          ? 'No drafts waiting'
          : <>
              <span>{drafts.length} draft{drafts.length > 1 ? 's' : ''} waiting</span>
              {oldest && <span className="drafts-pressure__age"> · oldest {formatRelTime(oldest.created_at)}</span>}
            </>
        }
      </div>
      <div className="draft-list">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="draft-row">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  <div className="es-skeleton" style={{ height: 11, width: 100 }} />
                  <div className="es-skeleton" style={{ height: 11, width: 70 }} />
                </div>
                <div className="es-skeleton" style={{ height: 26, width: 50, borderRadius: 6 }} />
              </div>
            ))
          : drafts.length === 0
            ? <div className="empty-state"><Inbox size={20} strokeWidth={1.5} /><span>No drafts waiting</span></div>
            : drafts.map(d => {
                const ref    = d.shipment_cases?.ref_number ?? d.case_id
                const client = d.shipment_cases?.client_name ?? ''
                return (
                  <div key={d.id} className="draft-row">
                    <div className="draft-row__body">
                      <div className="draft-row__type">{d.draft_type}</div>
                      <div className="draft-row__meta">
                        <span className="draft-row__ref">{ref}</span>
                        <span className="draft-row__client">{client}</span>
                        <span className="draft-row__time">{formatRelTime(d.created_at)}</span>
                      </div>
                    </div>
                    <button className="es-btn es-btn--primary draft-open-btn"
                      onClick={() => router.push(ROUTES.CASE(d.shipment_cases?.ref_number ?? d.case_id))}>
                      Open
                    </button>
                  </div>
                )
              })
        }
      </div>
    </div>
  )
}

// ── Dashboard Ribbon ──────────────────────────────────────────────────────────

function DashboardRibbon() {
  const [syncing, setSyncing] = useState(false)
  async function handleSync() {
    setSyncing(true)
    try { await fetch('/api/nylas-sync', { method: 'POST' }) } finally { setSyncing(false) }
  }
  return (
    <div className="es-ribbon">
      <div className="es-ribbon-group">
        <button className="es-rbtn primary" aria-label="New case (not yet implemented)">
          <Package size={13} strokeWidth={1.5} /> New Case
          <ChevronDown size={10} style={{ marginLeft: 2, opacity: 0.75 }} />
        </button>
      </div>
      <div className="es-ribbon-group">
        <button className="es-rbtn icon" title="Undo" aria-label="Undo"><Undo2 size={14} strokeWidth={1.5} /></button>
        <button className="es-rbtn icon" title="Redo" aria-label="Redo"><Redo2 size={14} strokeWidth={1.5} /></button>
      </div>
      <div className="es-ribbon-group">
        <button className="es-rbtn" aria-label="Filter"><Filter size={13} strokeWidth={1.5} /> Filter</button>
        <div className="es-vsep" />
        <button className="es-rbtn" aria-label="Reports"><TrendingUp size={13} strokeWidth={1.5} /> Reports</button>
        <button className="es-rbtn" aria-label="Assign"><Tag size={13} strokeWidth={1.5} /> Assign</button>
      </div>
      <div className="es-ribbon-group">
        <button className="es-rbtn" aria-label="Draft with AI">
          <Sparkles size={13} strokeWidth={1.5} /> Draft with AI
          <ChevronDown size={10} style={{ marginLeft: 2, opacity: 0.7 }} />
        </button>
        <button className="es-rbtn" aria-label="Run automation"><Zap size={13} strokeWidth={1.5} /> Run automation</button>
      </div>
      <div className="es-ribbon-group" style={{ marginLeft: 'auto', borderRight: 0 }}>
        <button className="es-rbtn" onClick={handleSync} disabled={syncing} aria-label="Sync inbox">
          {syncing
            ? <><span className="ribbon-spin" /> Syncing…</>
            : 'Sync'}
        </button>
        <button className="es-rbtn icon" title="Print" onClick={() => window.print()}><Printer size={14} strokeWidth={1.5} /></button>
        <button className="es-rbtn icon" title="More"><MoreHorizontal size={14} strokeWidth={1.5} /></button>
      </div>
    </div>
  )
}

// ── Status display helpers ────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  new: 'New', vendor_requested: 'Vendor Req.', quote_received: 'Quote Rcvd',
  quote_sent: 'Quote Sent', client_confirmed: 'Client Conf.', vendor_confirmed: 'Vendor Conf.',
  label_received: 'Label Rcvd', booked: 'Booked', in_transit: 'In Transit',
  delivered: 'Delivered', closed: 'Closed',
}
const statusLabel = (s: string) => STATUS_LABEL[s] ?? s

const STATUS_VARIANT: Record<string, string> = {
  new: 'neutral', vendor_requested: 'neutral', quote_received: 'neutral', quote_sent: 'neutral',
  client_confirmed: 'blue', vendor_confirmed: 'blue', label_received: 'blue', booked: 'blue',
  in_transit: 'blue', delivered: 'green', closed: 'green',
}
const statusVariant = (s: string) => STATUS_VARIANT[s] ?? 'neutral'

function priorityBadge(p: string) {
  if (p === 'urgent' || p === 'high') return <span className="es-badge es-badge--red">High</span>
  if (p === 'normal')                 return <span className="es-badge es-badge--neutral">Normal</span>
  return <span className="es-badge es-badge--neutral" style={{ opacity: 0.6 }}>Low</span>
}

// ── Main DashboardPage ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router  = useRouter()
  const [userProfile, setUserProfile] = useState<{ id: string; role: string } | null | undefined>(undefined)
  const [cases,   setCases]   = useState<ShipmentCase[]>([])
  const [emails,  setEmails]  = useState<EmailMessage[]>([])
  const [drafts,        setDrafts]        = useState<DraftWithCase[]>([])
  const [loading,       setLoading]       = useState(true)
  const [crmReviewCount, setCrmReviewCount] = useState(0)

  // Resolve current user role; redirect managers to their own dashboard
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
      if (profile?.role === 'manager') { router.replace('/operations'); return }
      setUserProfile({ id: user.id, role: profile?.role ?? 'operator' })
    })
  }, [router])

  useEffect(() => {
    if (userProfile === undefined) return
    let mounted = true
    const opFilter = (q: any) => userProfile ? q.eq('operator_id', userProfile.id) : q

    async function load() {
      const [{ data: casesData }, { data: emailsData }, { data: draftsData }, { count: crmCount }] = await Promise.all([
        opFilter(supabase.from('shipment_cases').select('*')).order('updated_at', { ascending: false }),
        supabase.from('email_messages').select('*').is('case_id', null).eq('folder', 'inbox').eq('direction', 'inbound').order('created_at', { ascending: false }),
        supabase.from('draft_tasks').select('*, shipment_cases(ref_number, client_name)').eq('status', 'ready').order('created_at', { ascending: false }),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('needs_review', true),
      ])
      if (!mounted) return
      setCases(casesData  ?? [])
      setEmails(emailsData ?? [])
      setDrafts(draftsData ?? [])
      setCrmReviewCount(crmCount ?? 0)
      setLoading(false)
    }
    load()

    // Realtime: refresh cases on any change
    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_cases' }, () => {
        opFilter(supabase.from('shipment_cases').select('*')).order('updated_at', { ascending: false })
          .then(({ data }: { data: ShipmentCase[] | null }) => { if (mounted && data) setCases(data) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_tasks' }, () => {
        supabase.from('draft_tasks').select('*, shipment_cases(ref_number, client_name)').eq('status', 'ready').order('created_at', { ascending: false })
          .then(({ data }) => { if (mounted && data) setDrafts(data) })
      })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [userProfile])

  const activeCases  = cases.filter(c => !CLOSED.includes(c.status as typeof CLOSED[number]))
  const delayedCount  = activeCases.filter(isDelayed).length
  const criticalCount = activeCases.filter(isCritical).length
  const silentCount   = activeCases.filter(isGoneSilent).length

  const goToFlights = useCallback(() => router.push(DASHBOARD_NAV.FLIGHT), [router])

  return (
    <>
      <DashboardRibbon />
      <main className="dashboard-main">
        <FlightAlertBar cases={cases} onViewFlights={goToFlights} />
        <KpiStrip
          active={activeCases.length}
          delayed={delayedCount}
          critical={criticalCount}
          silent={silentCount}
          crmReview={crmReviewCount}
        />
        <StatusPipeline allCases={cases} />
        <NeedsActionTable cases={cases} loading={loading} />
        <div className="zone4-row">
          <UnmatchedEmails emails={emails} loading={loading} />
          <AiDrafts drafts={drafts} loading={loading} />
        </div>
      </main>
    </>
  )
}
