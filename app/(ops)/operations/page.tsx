'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Users, Package, Clock, TrendingUp, AlertTriangle, Mail,
  ChevronDown, Activity, ArrowRight, CheckCircle, AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatRelTime } from '@/lib/utils'
import type { ShipmentCase, Profile, Organisation, EmailMessage, DraftTask, OfficeHours } from '@/lib/types'

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

const STATUS_LABEL: Record<string, string> = {
  new: 'New', vendor_requested: 'Vendor Req.', quote_received: 'Quote Rcvd',
  quote_sent: 'Quote Sent', client_confirmed: 'Client Conf.', vendor_confirmed: 'Vendor Conf.',
  label_received: 'Label Rcvd', booked: 'Booked', in_transit: 'In Transit',
  delivered: 'Delivered', closed: 'Closed',
}
const STATUS_VARIANT: Record<string, string> = {
  new: 'neutral', vendor_requested: 'neutral', quote_received: 'neutral', quote_sent: 'neutral',
  client_confirmed: 'blue', vendor_confirmed: 'blue', label_received: 'blue', booked: 'blue',
  in_transit: 'blue', delivered: 'green', closed: 'green',
}

const OPERATOR_COLORS = ['#5B7BF8','#E07B39','#34B76F','#8B5CF6','#E84040','#0891B2','#D97706','#059669']

const DEFAULT_OFFICE_HOURS: OfficeHours = {
  tz:   'Europe/Berlin',
  days: [9,18, 9,18, 9,18, 9,18, 9,18, null, null],
}

// ── Slim email type (only columns we select) ──────────────────────────────────

type SlimEmail = Pick<EmailMessage, 'id' | 'case_id' | 'direction' | 'created_at' | 'message_type'>

// ── Case predicates ───────────────────────────────────────────────────────────

const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const isActive  = (c: ShipmentCase) => !CLOSED.includes(c.status as typeof CLOSED[number])
const isDelayed = (c: ShipmentCase) =>
  !!c.flight_date && new Date(c.flight_date) < today0() && isActive(c)
const isStuck = (c: ShipmentCase) =>
  isActive(c) && Date.now() - new Date(c.updated_at).getTime() > 48 * 3600_000

// ── Business-hours response time ──────────────────────────────────────────────

function tzHourFraction(d: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const h = parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0')
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0')
  return h + m / 60
}

function tzDateStr(d: Date, tz: string): string {
  return d.toLocaleDateString('en-CA', { timeZone: tz }) // "YYYY-MM-DD"
}

function tzDow(d: Date, tz: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(d)
  return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(name)
}

function businessMinutesBetween(start: Date, end: Date, oh: OfficeHours): number {
  if (end <= start) return 0
  const dayPairs = Array.from({ length: 7 }, (_, i) => {
    const o = oh.days[i * 2], c = oh.days[i * 2 + 1]
    return (o != null && c != null) ? [o, c] as [number, number] : null
  })
  const startStr = tzDateStr(start, oh.tz)
  const endStr   = tzDateStr(end,   oh.tz)
  const startHour = tzHourFraction(start, oh.tz)
  const endHour   = tzHourFraction(end,   oh.tz)

  let minutes = 0
  const cursor  = new Date(start)
  const seen    = new Set<string>()

  while (seen.size <= 90) {
    const dayStr = tzDateStr(cursor, oh.tz)
    if (!seen.has(dayStr)) {
      seen.add(dayStr)
      const pair = dayPairs[tzDow(cursor, oh.tz)]
      if (pair) {
        let lo = pair[0], hi = pair[1]
        if (dayStr === startStr) lo = Math.max(lo, startHour)
        if (dayStr === endStr)   hi = Math.min(hi, endHour)
        if (hi > lo) minutes += (hi - lo) * 60
      }
    }
    if (dayStr === endStr) break
    cursor.setTime(cursor.getTime() + 24 * 3_600_000)
  }
  return minutes
}

// Median business-minutes response time across all inbound→outbound pairs for a set of cases
function medianResponseMinutes(
  emails: SlimEmail[],
  caseIds: Set<string>,
  oh: OfficeHours,
): number | null {
  const byCaseId: Record<string, SlimEmail[]> = {}
  for (const e of emails) {
    if (!e.case_id || !caseIds.has(e.case_id)) continue
    ;(byCaseId[e.case_id] ??= []).push(e)
  }
  const times: number[] = []
  for (const msgs of Object.values(byCaseId)) {
    const sorted = [...msgs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].direction === 'inbound' && sorted[i + 1].direction === 'outbound') {
        const mins = businessMinutesBetween(
          new Date(sorted[i].created_at),
          new Date(sorted[i + 1].created_at),
          oh,
        )
        if (mins > 0) times.push(mins)
      }
    }
  }
  if (!times.length) return null
  const s = [...times].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

function fmtMins(mins: number | null): string {
  if (mins == null) return '—'
  if (mins < 60) return `${Math.round(mins)}m`
  return `${(mins / 60).toFixed(1)}h`
}

// ── Per-operator stats ────────────────────────────────────────────────────────

interface OperatorStats {
  profile:          Profile
  activeCases:      number
  onTimeRate:       number | null
  avgResponseMins:  number | null
  openDrafts:       number
  unansweredEmails: number
}

function computeStats(
  profile: Profile,
  allCases: ShipmentCase[],
  emails: SlimEmail[],
  drafts: DraftTask[],
  oh: OfficeHours,
): OperatorStats {
  const cases   = allCases.filter(c => c.operator_id === profile.id)
  const active  = cases.filter(isActive)
  const caseIds = new Set(cases.map(c => c.id))

  const onTimeRate = active.length
    ? Math.round(active.filter(c => !isDelayed(c)).length / active.length * 100)
    : null

  const avgResponseMins = medianResponseMinutes(emails, caseIds, oh)

  const openDrafts = drafts.filter(
    d => caseIds.has(d.case_id) && ['pending','generating','ready'].includes(d.status),
  ).length

  // Unanswered: last message on the case is inbound and arrived > 4h ago
  const byCaseId: Record<string, SlimEmail[]> = {}
  for (const e of emails) {
    if (!e.case_id || !caseIds.has(e.case_id)) continue
    ;(byCaseId[e.case_id] ??= []).push(e)
  }
  const now = Date.now()
  let unansweredEmails = 0
  for (const msgs of Object.values(byCaseId)) {
    const sorted = [...msgs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
    const last = sorted[sorted.length - 1]
    if (last.direction === 'inbound' && now - +new Date(last.created_at) > 4 * 3_600_000) {
      unansweredEmails++
    }
  }

  return { profile, activeCases: active.length, onTimeRate, avgResponseMins, openDrafts, unansweredEmails }
}

// ── useCountUp ────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    let start: number | null = null
    const tick = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])
  return val
}

// ── Ribbon ────────────────────────────────────────────────────────────────────

function Ribbon({
  profiles, selected, onSelect,
}: {
  profiles: Profile[]
  selected: string | 'all'
  onSelect: (id: string | 'all') => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const label = selected === 'all'
    ? 'All Operators'
    : profiles.find(p => p.id === selected)?.display_name ?? 'Operator'

  return (
    <div className="es-ribbon">
      <div className="es-ribbon-group">
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--es-n-500)', padding: '0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Operations
        </span>
      </div>
      <div className="es-ribbon-group" ref={ref} style={{ position: 'relative' }}>
        <button className="es-rbtn" onClick={() => setOpen(o => !o)}>
          <Users size={13} strokeWidth={1.5} />
          {label}
          <ChevronDown size={10} className="caret" />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 50,
            background: 'var(--es-n-0)', border: '1px solid var(--es-n-150)',
            borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 180,
          }}>
            {(['all', ...profiles.map(p => p.id)] as const).map(id => {
              const name = id === 'all' ? 'All Operators' : profiles.find(p => p.id === id)?.display_name ?? id
              const active = selected === id
              return (
                <button
                  key={id}
                  onClick={() => { onSelect(id); setOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', background: active ? 'var(--es-brand-light)' : 'transparent',
                    border: 'none', fontSize: 12, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--es-brand-text)' : 'var(--es-n-700)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── KPI Bar ───────────────────────────────────────────────────────────────────

function KpiBar({ cases, emails, oh }: {
  cases: ShipmentCase[]
  emails: SlimEmail[]
  oh: OfficeHours
}) {
  const active    = cases.filter(isActive)
  const revenue   = cases.reduce((s, c) => s + (c.rate_amount ?? 0), 0)
  const currency  = cases.find(c => c.rate_currency)?.rate_currency ?? 'EUR'
  const caseIds   = new Set(cases.map(c => c.id))
  const respMins  = medianResponseMinutes(emails, caseIds, oh)
  const onTimePct = active.length
    ? Math.round(active.filter(c => !isDelayed(c)).length / active.length * 100)
    : null

  const animActive = useCountUp(active.length)

  return (
    <div className="kpi-strip">
      <div className="kpi-card" style={{ cursor: 'default' }}>
        <div className="kpi-card__top"><Package size={16} strokeWidth={1.5} className="kpi-card__icon" /></div>
        <div className="kpi-card__count">{animActive}</div>
        <div className="kpi-card__label">Active Cases</div>
      </div>
      <div className="kpi-card" style={{ cursor: 'default' }}>
        <div className="kpi-card__top"><TrendingUp size={16} strokeWidth={1.5} className="kpi-card__icon" /></div>
        <div className="kpi-card__count" style={{ fontSize: 20 }}>
          {currency} {revenue.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
        </div>
        <div className="kpi-card__label">Pipeline Revenue</div>
      </div>
      <div className="kpi-card" style={{ cursor: 'default' }}>
        <div className="kpi-card__top"><Clock size={16} strokeWidth={1.5} className="kpi-card__icon" /></div>
        <div className="kpi-card__count" style={{ fontSize: 24 }}>{fmtMins(respMins)}</div>
        <div className="kpi-card__label">Median Response Time</div>
      </div>
      <div className={`kpi-card${onTimePct != null && onTimePct < 60 ? ' kpi-card--red' : onTimePct != null && onTimePct < 80 ? ' kpi-card--amber' : ''}`} style={{ cursor: 'default' }}>
        <div className="kpi-card__top"><CheckCircle size={16} strokeWidth={1.5} className="kpi-card__icon" /></div>
        <div className="kpi-card__count" style={{ fontSize: 24 }}>{onTimePct != null ? `${onTimePct}%` : '—'}</div>
        <div className="kpi-card__label">On-Time Rate</div>
      </div>
    </div>
  )
}

// ── Operator Performance Table ────────────────────────────────────────────────

function OperatorTable({ stats, loading }: { stats: OperatorStats[]; loading: boolean }) {
  return (
    <div className="es-card">
      <div className="es-card__header">
        <Users size={13} strokeWidth={1.5} />
        <span className="es-card__title">Operator Performance</span>
        <span className="es-card__subtitle">{stats.length} operators</span>
      </div>
      <table className="es-table">
        <thead>
          <tr>
            <th className="th-nosort">Operator</th>
            <th className="th-nosort" style={{ textAlign: 'right' }}>Active Cases</th>
            <th className="th-nosort" style={{ textAlign: 'right' }}>On-Time</th>
            <th className="th-nosort" style={{ textAlign: 'right' }}>Median Response</th>
            <th className="th-nosort" style={{ textAlign: 'right' }}>Open Drafts</th>
            <th className="th-nosort" style={{ textAlign: 'right' }}>Unanswered</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{[160,60,60,80,60,60].map((w, j) => (
                  <td key={j} style={{ padding: '9px 12px' }}><div className="es-skeleton" style={{ height: 11, width: w }} /></td>
                ))}</tr>
              ))
            : stats.length === 0
              ? <tr><td colSpan={6}><div className="empty-state">No operators found</div></td></tr>
              : stats.map(s => (
                  <tr key={s.profile.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--es-brand-light)', color: 'var(--es-brand-text)',
                          display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                        }}>
                          {(s.profile.display_name ?? s.profile.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="cell-client">{s.profile.display_name ?? s.profile.email}</div>
                          <div className="cell-email">{s.profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}><span className="cell-ref">{s.activeCases}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {s.onTimeRate != null
                        ? <span className={`es-badge es-badge--${s.onTimeRate >= 80 ? 'green' : s.onTimeRate >= 60 ? 'amber' : 'red'}`}>{s.onTimeRate}%</span>
                        : <span style={{ fontSize: 12, color: 'var(--es-n-300)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="cell-time">{fmtMins(s.avgResponseMins)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.openDrafts > 0
                        ? <span className="es-badge es-badge--amber">{s.openDrafts}</span>
                        : <span className="cell-ref">{s.openDrafts}</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.unansweredEmails > 0
                        ? <span className="es-badge es-badge--red">{s.unansweredEmails}</span>
                        : <span className="cell-ref">{s.unansweredEmails}</span>}
                    </td>
                  </tr>
                ))
          }
        </tbody>
      </table>
    </div>
  )
}

// ── Pipeline Funnel ───────────────────────────────────────────────────────────

function PipelineFunnel({ cases }: { cases: ShipmentCase[] }) {
  const counts = Object.fromEntries(
    PIPELINE_STAGES.map(s => [s.key, cases.filter(c => (s.statuses as readonly string[]).includes(c.status)).length])
  )
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="es-card pipeline-card">
      <div className="es-card__header">
        <TrendingUp size={13} strokeWidth={1.5} />
        <span className="es-card__title">Cases by Stage</span>
        <span className="es-card__subtitle">{cases.length} total</span>
      </div>
      <div className="pipeline-track">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = counts[stage.key]
          const pct   = Math.max(6, Math.round((count / max) * 100))
          return (
            <React.Fragment key={stage.key}>
              <div className={`pipeline-node${count === 0 ? ' pipeline-node--empty' : ''}`} style={{ cursor: 'default' }}>
                <span className="pipeline-node__count">{count}</span>
                <span className="pipeline-node__dot-wrap"><span className="pipeline-node__dot" /></span>
                <div className="pipeline-node__bar-track">
                  <div className="pipeline-node__bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="pipeline-node__label">{stage.label}</span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && <div className="pipeline-connector" />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ── Volume Trend (SVG sparklines, one line per operator) ──────────────────────

function VolumeTrend({
  allCases, profiles, selected,
}: {
  allCases: ShipmentCase[]
  profiles: Profile[]
  selected: string | 'all'
}) {
  const WEEKS = 6, W = 100, H = 60
  const now   = Date.now()

  const visible = selected === 'all' ? profiles : profiles.filter(p => p.id === selected)

  const series = visible.map((p, i) => {
    const counts = Array.from({ length: WEEKS }, (_, w) => {
      const end   = now - (WEEKS - 1 - w - 1) * 7 * 86_400_000
      const start = now - (WEEKS - 1 - w)     * 7 * 86_400_000
      return allCases.filter(c =>
        c.operator_id === p.id &&
        +new Date(c.created_at) >= start &&
        +new Date(c.created_at) <  end
      ).length
    })
    return { profile: p, counts, color: OPERATOR_COLORS[i % OPERATOR_COLORS.length] }
  })

  const maxVal = Math.max(...series.flatMap(s => s.counts), 1)
  const xStep  = W / (WEEKS - 1)

  const pts = (counts: number[]) =>
    counts.map((c, i) => `${i * xStep},${H - (c / maxVal) * H}`).join(' ')

  const weekLabels = Array.from({ length: WEEKS }, (_, i) =>
    i === WEEKS - 1 ? 'Now' : `${WEEKS - 1 - i}w`
  )

  return (
    <div className="es-card">
      <div className="es-card__header">
        <Activity size={13} strokeWidth={1.5} />
        <span className="es-card__title">Volume Trend</span>
        <span className="es-card__subtitle">cases opened per operator · 6 weeks</span>
      </div>
      <div style={{ padding: '12px 16px 14px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 72, overflow: 'visible' }} preserveAspectRatio="none">
          {series.map(s => (
            <polyline
              key={s.profile.id}
              points={pts(s.counts)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {weekLabels.map(l => (
            <span key={l} style={{ fontSize: 9, color: 'var(--es-n-300)' }}>{l}</span>
          ))}
        </div>
        {visible.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
            {series.map(s => (
              <div key={s.profile.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 2, background: s.color, borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--es-n-500)' }}>
                  {s.profile.display_name ?? s.profile.email}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Alerts Panel ──────────────────────────────────────────────────────────────

function AlertsPanel({ cases, emails, loading }: {
  cases: ShipmentCase[]
  emails: SlimEmail[]
  loading: boolean
}) {
  const now = Date.now()

  const stuck = cases.filter(isStuck)

  const byCaseId: Record<string, SlimEmail[]> = {}
  for (const e of emails) {
    if (!e.case_id) continue
    ;(byCaseId[e.case_id] ??= []).push(e)
  }

  const unanswered = cases.filter(c => {
    if (!isActive(c)) return false
    const msgs = byCaseId[c.id]
    if (!msgs?.length) return false
    const last = [...msgs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)).at(-1)!
    return last.direction === 'inbound' && now - +new Date(last.created_at) > 4 * 3_600_000
  })

  const escalations = cases.filter(c =>
    isActive(c) && (c.tags?.includes('escalation') || c.priority === 'urgent')
  )

  const total = stuck.length + unanswered.length + escalations.length

  return (
    <div className="es-card">
      <div className="es-card__header">
        <AlertTriangle size={13} strokeWidth={1.5} />
        <span className="es-card__title">Alerts</span>
        {total > 0 && (
          <span className="es-badge es-badge--red" style={{ marginLeft: 'auto' }}>{total}</span>
        )}
      </div>
      {loading
        ? <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="es-skeleton" style={{ height: 32 }} />)}
          </div>
        : total === 0
          ? (
            <div className="empty-state">
              <CheckCircle size={16} strokeWidth={1.5} />
              <span>No active alerts</span>
            </div>
          )
          : (
            <div>
              {stuck.map(c => (
                <div key={`stuck-${c.id}`} className="email-row">
                  <AlertCircle size={14} strokeWidth={1.5} style={{ color: 'var(--es-high)', flexShrink: 0, marginTop: 1 }} />
                  <div className="email-row__body">
                    <div className="email-row__sender">Stuck — {c.ref_number ?? c.case_code}</div>
                    <div className="email-row__subject">{c.client_name ?? c.client_email} · No update for {formatRelTime(c.updated_at)}</div>
                  </div>
                  <span className="email-row__time"><span className="es-badge es-badge--amber">48h+</span></span>
                </div>
              ))}
              {unanswered.map(c => {
                const last = [...(byCaseId[c.id] ?? [])].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)).at(-1)
                return (
                  <div key={`unans-${c.id}`} className="email-row">
                    <Mail size={14} strokeWidth={1.5} style={{ color: 'var(--es-urgent)', flexShrink: 0, marginTop: 1 }} />
                    <div className="email-row__body">
                      <div className="email-row__sender">Unanswered — {c.ref_number ?? c.case_code}</div>
                      <div className="email-row__subject">{c.client_name ?? c.client_email} · Client waiting since {formatRelTime(last?.created_at ?? null)}</div>
                    </div>
                    <span className="email-row__time"><span className="es-badge es-badge--red">4h+</span></span>
                  </div>
                )
              })}
              {escalations.map(c => (
                <div key={`esc-${c.id}`} className="email-row">
                  <AlertTriangle size={14} strokeWidth={1.5} style={{ color: 'var(--es-urgent)', flexShrink: 0, marginTop: 1 }} />
                  <div className="email-row__body">
                    <div className="email-row__sender">Escalation — {c.ref_number ?? c.case_code}</div>
                    <div className="email-row__subject">{c.client_name ?? c.client_email} · {c.priority === 'urgent' ? 'Marked urgent' : 'Escalation tag'}</div>
                  </div>
                  <span className="email-row__time"><span className="es-badge es-badge--red">URGENT</span></span>
                </div>
              ))}
            </div>
          )
      }
    </div>
  )
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ cases, profiles, loading }: {
  cases: ShipmentCase[]
  profiles: Profile[]
  loading: boolean
}) {
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const sorted = [...cases]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 25)

  return (
    <div className="es-card">
      <div className="es-card__header">
        <Activity size={13} strokeWidth={1.5} />
        <span className="es-card__title">Recent Activity</span>
        <span className="es-card__subtitle">last {sorted.length} updated cases</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="es-table">
          <thead>
            <tr>
              <th className="th-nosort">Ref</th>
              <th className="th-nosort">Client</th>
              <th className="th-nosort">Route</th>
              <th className="th-nosort">Status</th>
              <th className="th-nosort">Operator</th>
              <th className="th-nosort">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{[60,120,100,80,100,60].map((w, j) => (
                    <td key={j} style={{ padding: '9px 12px' }}><div className="es-skeleton" style={{ height: 11, width: w }} /></td>
                  ))}</tr>
                ))
              : sorted.length === 0
                ? <tr><td colSpan={6}><div className="empty-state">No cases found</div></td></tr>
                : sorted.map(c => {
                    const op = c.operator_id ? (profileMap[c.operator_id] ?? null) : null
                    return (
                      <tr key={c.id}>
                        <td><span className="cell-ref">{c.ref_number ?? c.case_code}</span></td>
                        <td><div className="cell-client">{c.client_name ?? '—'}</div></td>
                        <td>
                          <div className="cell-route">
                            <span>{c.origin ?? '—'}</span>
                            <ArrowRight size={11} strokeWidth={1.5} style={{ color: 'var(--es-n-300)', flexShrink: 0 }} />
                            <span>{c.destination ?? '—'}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`es-badge es-badge--${STATUS_VARIANT[c.status] ?? 'neutral'}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                        </td>
                        <td>
                          {op
                            ? <span style={{ fontSize: 12, color: 'var(--es-n-600)' }}>{op.display_name ?? op.email}</span>
                            : <span style={{ fontSize: 11, color: 'var(--es-n-300)' }}>Unassigned</span>}
                        </td>
                        <td><span className="cell-time">{formatRelTime(c.updated_at)}</span></td>
                      </tr>
                    )
                  })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const [cases,    setCases]    = useState<ShipmentCase[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [emails,   setEmails]   = useState<SlimEmail[]>([])
  const [drafts,   setDrafts]   = useState<DraftTask[]>([])
  const [org,      setOrg]      = useState<Organisation | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<string | 'all'>('all')

  useEffect(() => {
    let alive = true
    async function load() {
      const [
        { data: casesData },
        { data: profilesData },
        { data: emailsData },
        { data: draftsData },
        { data: orgData },
      ] = await Promise.all([
        supabase.from('shipment_cases').select('*').order('updated_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('email_messages')
          .select('id,case_id,direction,created_at,message_type')
          .order('created_at', { ascending: true }),
        supabase.from('draft_tasks').select('*').in('status', ['pending','generating','ready']),
        supabase.from('organisations').select('*').limit(1).maybeSingle(),
      ])
      if (!alive) return
      setCases(casesData ?? [])
      setProfiles((profilesData ?? []).filter(p => p.role === 'operator'))
      setEmails(emailsData as SlimEmail[] ?? [])
      setDrafts(draftsData ?? [])
      setOrg(orgData ?? null)
      setLoading(false)
    }
    load()
    return () => { alive = false }
  }, [])

  const oh = org?.office_hours ?? DEFAULT_OFFICE_HOURS

  const filteredCases = useMemo(
    () => selected === 'all' ? cases : cases.filter(c => c.operator_id === selected),
    [cases, selected],
  )

  const operatorStats = useMemo(
    () => profiles.map(p => computeStats(p, cases, emails, drafts, oh)),
    [profiles, cases, emails, drafts, oh],
  )

  const filteredStats = useMemo(
    () => selected === 'all' ? operatorStats : operatorStats.filter(s => s.profile.id === selected),
    [operatorStats, selected],
  )

  return (
    <>
      <Ribbon profiles={profiles} selected={selected} onSelect={setSelected} />
      <main className="dashboard-main">
        <KpiBar cases={filteredCases} emails={emails} oh={oh} />
        <OperatorTable stats={filteredStats} loading={loading} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <PipelineFunnel cases={filteredCases} />
          <VolumeTrend allCases={cases} profiles={profiles} selected={selected} />
        </div>
        <AlertsPanel cases={filteredCases} emails={emails} loading={loading} />
        <ActivityFeed cases={filteredCases} profiles={profiles} loading={loading} />
      </main>
    </>
  )
}
