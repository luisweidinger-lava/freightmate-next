'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Users, Package, TrendingUp, AlertTriangle, Mail,
  ChevronDown, ChevronRight, Activity, ArrowRight, CheckCircle, AlertCircle, Calendar,
} from 'lucide-react'
import { Gantt, ViewMode } from 'gantt-task-react'
import type { Task } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { supabase } from '@/lib/supabase'
import { formatRelTime, formatDateShort } from '@/lib/utils'
import type { ShipmentCase, Profile, Vendor } from '@/lib/types'

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

// ── Slim email type (only columns we select) ──────────────────────────────────

interface SlimEmail {
  id: string
  case_id: string | null
  direction: 'inbound' | 'outbound'
  created_at: string
  message_type: string | null
}

// ── Team KPI row returned by get_team_kpis() RPC ──────────────────────────────

interface TeamKpi {
  operator_id:   string
  operator_email: string
  display_name:  string | null
  active_cases:  number
  critical_cases: number
  last_seen_at:  string | null
}

interface OrgOperator {
  id:           string
  email:        string
  display_name: string | null
  in_team:      boolean
}

// ── Case predicates ───────────────────────────────────────────────────────────

const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const isActive  = (c: ShipmentCase) => !CLOSED.includes(c.status as typeof CLOSED[number])
const isDelayed = (c: ShipmentCase) =>
  !!c.flight_date && new Date(c.flight_date) < today0() && isActive(c)
const isStuck = (c: ShipmentCase) =>
  isActive(c) && Date.now() - new Date(c.updated_at).getTime() > 48 * 3600_000

function CardTip({ title, tip }: { title: string; tip: string }) {
  return (
    <span className="card-title-tip">
      <span className="es-card__title">{title}</span>
      <span className="card-tooltip">{tip}</span>
    </span>
  )
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

// ── KPI Bar ───────────────────────────────────────────────────────────────────

function KpiBar({ teamKpis }: { teamKpis: TeamKpi[] }) {
  const totalActive   = teamKpis.reduce((s, k) => s + k.active_cases, 0)
  const totalCritical = teamKpis.reduce((s, k) => s + k.critical_cases, 0)

  const animActive = useCountUp(totalActive)

  return (
    <>
      <div className="kpi-card" style={{ cursor: 'default' }}>
        <div className="kpi-card__top"><Package size={16} strokeWidth={1.5} className="kpi-card__icon" /></div>
        <div className="kpi-card__count">{animActive}</div>
        <div className="kpi-card__label">Active Cases</div>
      </div>
      <div className="kpi-card" style={{ cursor: 'default' }}>
        <div className="kpi-card__top"><AlertTriangle size={16} strokeWidth={1.5} className="kpi-card__icon" /></div>
        <div className="kpi-card__count" style={{ fontSize: 24, color: totalCritical > 0 ? 'var(--es-urgent)' : undefined }}>
          {totalCritical}
        </div>
        <div className="kpi-card__label">Critical Cases</div>
      </div>
      <div className="kpi-card" style={{ cursor: 'default' }}>
        <div className="kpi-card__top"><Users size={16} strokeWidth={1.5} className="kpi-card__icon" /></div>
        <div className="kpi-card__count" style={{ fontSize: 24 }}>{teamKpis.length}</div>
        <div className="kpi-card__label">Operators</div>
      </div>
    </>
  )
}

// ── Operator Performance Table ────────────────────────────────────────────────

function OperatorTable({ kpis, loading, orgOperators, onAdd, onRemove }: {
  kpis: TeamKpi[]
  loading: boolean
  orgOperators: OrgOperator[]
  onAdd:    (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [managing, setManaging] = useState(false)
  const now = Date.now()
  return (
    <div className="es-card">
      <div className="es-card__header">
        <Users size={13} strokeWidth={1.5} />
        <CardTip title="Operators" tip="Live case load and online status per operator" />
        <span className="es-card__subtitle">{kpis.length} operator{kpis.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => setManaging(m => !m)}
          style={{
            marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 4,
            border: '1px solid var(--es-n-100)', background: 'none',
            cursor: 'pointer', color: 'var(--es-n-500)',
          }}
        >
          {managing ? 'Done' : 'Manage Team'}
        </button>
      </div>

      {managing && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--es-n-50)', background: 'var(--es-n-25)' }}>
          <div style={{ fontSize: 11, color: 'var(--es-n-400)', marginBottom: 6 }}>
            All operators in your organisation:
          </div>
          {orgOperators.length === 0
            ? <div style={{ fontSize: 11, color: 'var(--es-n-300)' }}>No other operators found.</div>
            : orgOperators.map(op => (
              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ flex: 1, fontSize: 12 }}>{op.display_name ?? op.email}</span>
                <span style={{ fontSize: 11, color: 'var(--es-n-300)' }}>{op.email}</span>
                <button
                  onClick={() => op.in_team ? onRemove(op.id) : onAdd(op.id)}
                  style={{
                    fontSize: 11, padding: '2px 10px', borderRadius: 4, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: op.in_team ? 'var(--es-n-200)' : 'var(--es-brand)',
                    background: op.in_team ? 'none' : 'var(--es-brand)',
                    color: op.in_team ? 'var(--es-n-500)' : 'white',
                  }}
                >
                  {op.in_team ? 'Remove' : 'Add'}
                </button>
              </div>
            ))
          }
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
      <table className="es-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: '25%' }} />
          <col style={{ width: '30%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
        </colgroup>
        <thead>
          <tr>
            <th className="th-nosort">Name</th>
            <th className="th-nosort">Email</th>
            <th className="th-nosort" style={{ textAlign: 'right' }}>Active</th>
            <th className="th-nosort" style={{ textAlign: 'right' }}>Critical</th>
            <th className="th-nosort" style={{ textAlign: 'center' }}>Online</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{[140,160,60,70,80].map((w, j) => (
                  <td key={j} style={{ padding: '9px 12px' }}><div className="es-skeleton" style={{ height: 11, width: w }} /></td>
                ))}</tr>
              ))
            : kpis.length === 0
              ? <tr><td colSpan={5}><div className="empty-state">No operators found</div></td></tr>
              : kpis.map(k => {
                  const online = !!k.last_seen_at && now - new Date(k.last_seen_at).getTime() < 5 * 60 * 1000
                  return (
                    <tr key={k.operator_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--es-brand-light)', color: 'var(--es-brand-text)',
                            display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700,
                          }}>
                            {(k.display_name ?? k.operator_email)[0].toUpperCase()}
                          </div>
                          <div className="cell-client">{k.display_name ?? '—'}</div>
                        </div>
                      </td>
                      <td><div className="cell-email">{k.operator_email}</div></td>
                      <td style={{ textAlign: 'right' }}><span className="cell-ref">{k.active_cases}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        {k.critical_cases > 0
                          ? <span className="es-badge es-badge--red">{k.critical_cases}</span>
                          : <span className="cell-ref" style={{ color: 'var(--es-n-300)' }}>0</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                          background: online ? '#22C55E' : 'var(--es-n-200)',
                        }} title={online ? 'Online' : 'Offline'} />
                      </td>
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

// ── Pipeline Funnel ───────────────────────────────────────────────────────────

function PipelineFunnel({ cases, compact = false }: { cases: ShipmentCase[], compact?: boolean }) {
  const counts = Object.fromEntries(
    PIPELINE_STAGES.map(s => [s.key, cases.filter(c => (s.statuses as readonly string[]).includes(c.status)).length])
  )
  const max = Math.max(...Object.values(counts), 1)

  if (compact) {
    return (
      <div className="es-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TrendingUp size={13} strokeWidth={1.5} style={{ color: 'var(--es-n-300)', flexShrink: 0 }} />
          <span className="card-title-tip" style={{ fontSize: 11, fontWeight: 600, color: 'var(--es-n-600)' }}>
            Cases by Stage
            <span className="card-tooltip">How many cases are in each stage of the shipment lifecycle</span>
          </span>
          <span style={{ fontSize: 10, color: 'var(--es-n-350)', marginLeft: 2 }}>{cases.length} total</span>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'stretch', gap: 0 }}>
          {PIPELINE_STAGES.map((stage, i) => {
            const count = counts[stage.key]
            const pct   = Math.max(6, Math.round((count / max) * 100))
            return (
              <React.Fragment key={stage.key}>
                <div style={{
                  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'space-between', gap: 4,
                  opacity: count === 0 ? 0.4 : 1, cursor: 'default',
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: 'var(--es-n-900)', letterSpacing: '-0.01em' }}>{count}</span>
                  <div style={{ width: '100%', height: 2, background: 'var(--es-n-100)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--es-n-150)', borderRadius: 1, transition: 'width 400ms ease' }} />
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--es-n-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{stage.label}</span>
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div style={{ width: 1, background: 'var(--es-n-100)', alignSelf: 'stretch', margin: '2px 0', flexShrink: 0 }} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

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
        <CardTip title="Volume Trend" tip="Weekly cases opened per operator over the past 6 weeks" />
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
        <CardTip title="Alerts" tip="Cases stuck with no update for 3+ days or clients awaiting a reply" />
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

// ── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanBoard({ cases, profiles, loading }: {
  cases:    ShipmentCase[]
  profiles: Profile[]
  loading:  boolean
}) {
  const activeCases = cases.filter(c => !CLOSED.includes(c.status as typeof CLOSED[number]))

  // Build columns: one per operator who has cases, plus Unassigned
  const columns = useMemo(() => {
    const map = new Map<string, { label: string; color: string; cases: ShipmentCase[] }>()
    map.set('__unassigned__', { label: 'Unassigned', color: '#9CA3AF', cases: [] })
    profiles
      .filter(p => p.role === 'operator')
      .forEach((p, i) => {
        map.set(p.id, { label: p.display_name ?? p.email, color: OPERATOR_COLORS[i % OPERATOR_COLORS.length], cases: [] })
      })
    for (const c of activeCases) {
      const key = c.operator_id && map.has(c.operator_id) ? c.operator_id : '__unassigned__'
      map.get(key)!.cases.push(c)
    }
    return [...map.values()]
  }, [activeCases, profiles])

  return (
    <div className="es-card">
      <div className="es-card__header">
        <Activity size={13} strokeWidth={1.5} />
        <CardTip title="Operator Board" tip="Active cases grouped by operator — drag to reassign" />
        <span className="es-card__subtitle">{activeCases.length} active case{activeCases.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ overflowX: 'auto', padding: '10px 14px 14px' }}>
        {loading ? (
          <div style={{ display: 'flex', gap: 10 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ minWidth: 200, flex: '0 0 200px' }}>
                <div className="es-skeleton" style={{ height: 28, borderRadius: 4, marginBottom: 8 }} />
                {Array.from({ length: 2 }).map((__, j) => (
                  <div key={j} className="es-skeleton" style={{ height: 72, borderRadius: 4, marginBottom: 6 }} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {columns.map(col => (
              <div key={col.label} style={{ minWidth: 200, flex: '0 0 200px' }}>
                {/* Column header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 8px', borderRadius: 4, marginBottom: 6,
                  background: 'var(--es-n-50)',
                  borderLeft: `3px solid ${col.color}`,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--es-n-700)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {col.label}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: col.color,
                    background: `${col.color}18`, borderRadius: 10, padding: '1px 6px', flexShrink: 0 }}>
                    {col.cases.length}
                  </span>
                </div>
                {/* Case cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {col.cases.length === 0 ? (
                    <div style={{ padding: '10px 8px', fontSize: 11, color: 'var(--es-n-300)', textAlign: 'center',
                      border: '1px dashed var(--es-n-100)', borderRadius: 4 }}>
                      No active cases
                    </div>
                  ) : col.cases.map(c => (
                    <div key={c.id} style={{
                      padding: '8px 10px', borderRadius: 4,
                      border: '1px solid var(--es-n-100)',
                      background: '#fff',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--es-n-700)', letterSpacing: '0.01em' }}>
                          {c.ref_number ?? c.case_code ?? '—'}
                        </span>
                        <span className={`es-badge es-badge--${STATUS_VARIANT[c.status] ?? 'neutral'}`} style={{ fontSize: 9 }}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </div>
                      {c.client_name && (
                        <div style={{ fontSize: 11, color: 'var(--es-n-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.client_name}
                        </div>
                      )}
                      {(c.origin || c.destination) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--es-n-400)' }}>
                          <span>{c.origin ?? '—'}</span>
                          <ArrowRight size={9} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                          <span>{c.destination ?? '—'}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--es-n-300)', marginTop: 1 }}>
                        {formatRelTime(c.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



// ── Cases Table ───────────────────────────────────────────────────────────────

function CasesTable({ cases, vendors, profiles, loading }: {
  cases:    ShipmentCase[]
  vendors:  Vendor[]
  profiles: Profile[]
  loading:  boolean
}) {
  const vendorMap  = Object.fromEntries(vendors.map(v => [v.id, v]))
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  return (
    <div className="es-card">
      <div className="es-card__header">
        <Package size={13} strokeWidth={1.5} />
        <CardTip title="Cases" tip="All shipment cases in the selected period with status and contact details" />
        <span className="es-card__subtitle">{cases.length} total</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="es-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '7%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="th-nosort">Ref. No</th>
              <th className="th-nosort">Route</th>
              <th className="th-nosort">Cargo</th>
              <th className="th-nosort" style={{ textAlign: 'right' }}>Value</th>
              <th className="th-nosort">Client</th>
              <th className="th-nosort">Vendor</th>
              <th className="th-nosort">Start Date</th>
              <th className="th-nosort">Status</th>
              <th className="th-nosort">Last Contact</th>
              <th className="th-nosort">Priority</th>
              <th className="th-nosort">Operator</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} style={{ padding: '9px 12px' }}>
                      <div className="es-skeleton" style={{ height: 11, width: '80%' }} />
                    </td>
                  ))}</tr>
                ))
              : cases.length === 0
                ? <tr><td colSpan={11}><div className="empty-state">No cases found</div></td></tr>
                : cases.map(c => {
                    const vendor   = c.vendor_id ? vendorMap[c.vendor_id] : null
                    const operator = c.operator_id ? profileMap[c.operator_id] : null
                    return (
                      <tr key={c.id}>
                        <td><span className="cell-ref">{c.ref_number ?? c.case_code}</span></td>
                        <td>
                          <div className="cell-route">
                            <span>{c.origin ?? '—'}</span>
                            <ArrowRight size={10} strokeWidth={1.5} style={{ color: 'var(--es-n-300)', flexShrink: 0 }} />
                            <span>{c.destination ?? '—'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, color: 'var(--es-n-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.item_desc ?? '—'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {c.rate_amount != null
                            ? <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--es-n-700)', fontVariantNumeric: 'tabular-nums' }}>
                                {c.rate_currency} {c.rate_amount.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                              </span>
                            : <span style={{ color: 'var(--es-n-300)' }}>—</span>}
                        </td>
                        <td>
                          <div className="cell-client" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.client_name ?? c.client_email}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, color: 'var(--es-n-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {vendor?.name ?? '—'}
                          </div>
                        </td>
                        <td><span className="cell-date">{formatDateShort(c.created_at)}</span></td>
                        <td>
                          <span className={`es-badge es-badge--${STATUS_VARIANT[c.status] ?? 'neutral'}`}>
                            {STATUS_LABEL[c.status] ?? c.status}
                          </span>
                        </td>
                        <td><span className="cell-time">{formatRelTime(c.last_outbound_at)}</span></td>
                        <td>{priorityBadge(c.priority)}</td>
                        <td>
                          <div style={{ fontSize: 12, color: 'var(--es-n-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {operator ? (operator.display_name ?? operator.email) : <span style={{ color: 'var(--es-n-300)' }}>Unassigned</span>}
                          </div>
                        </td>
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

function priorityBadge(p: string) {
  if (p === 'urgent') return <span className="es-badge es-badge--red">Urgent</span>
  if (p === 'high')   return <span className="es-badge es-badge--amber">High</span>
  if (p === 'normal') return <span className="es-badge es-badge--neutral">Normal</span>
  return <span className="es-badge es-badge--neutral" style={{ opacity: 0.6 }}>Low</span>
}

// ── Timeline Card (gantt-task-react) ─────────────────────────────────────────

type PeriodKey = '1W' | '1M' | '3M'

const PERIOD_VIEW: Record<PeriodKey, ViewMode> = {
  '1W': ViewMode.Day,
  '1M': ViewMode.Week,
  '3M': ViewMode.Week,
}

const PERIOD_LABEL: Record<PeriodKey, string> = {
  '1W': 'Day', '1M': 'Week', '3M': 'Month',
}

const PERIOD_CUTOFF_MS: Record<PeriodKey, number> = {
  '1W':  7 * 86_400_000,
  '1M': 30 * 86_400_000,
  '3M': 90 * 86_400_000,
}

function GanttListHeader({ headerHeight, fontFamily, fontSize, rowWidth }: {
  headerHeight: number; fontFamily: string; fontSize: string; rowWidth: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      height: headerHeight, fontFamily, fontSize,
      borderBottom: '1px solid #e6e4e4', padding: '0 8px',
      width: rowWidth, boxSizing: 'border-box' as const,
      fontWeight: 600, color: 'var(--es-n-600)',
    }}>
      Operator / Case
    </div>
  )
}

function GanttListTable({ rowHeight, rowWidth, fontFamily, fontSize, tasks, onExpanderClick }: {
  rowHeight: number; rowWidth: string; fontFamily: string; fontSize: string; locale: string
  tasks: Task[]; selectedTaskId: string; setSelectedTask: (taskId: string) => void
  onExpanderClick: (t: Task) => void
}) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  return (
    <div style={{ fontFamily, fontSize, width: rowWidth, boxSizing: 'border-box' as const }}>
      {tasks.map(t => {
        const isOpRow    = t.type === 'project'
        const isCollapsed = (t as any).hideChildren === true
        const hovered    = isOpRow && hoveredId === t.id
        return (
          <div
            key={t.id}
            onClick={() => isOpRow && onExpanderClick(t)}
            onMouseEnter={() => isOpRow && setHoveredId(t.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              height: rowHeight, display: 'flex', alignItems: 'center',
              padding: isOpRow ? '0 8px' : '0 8px 0 24px',
              borderBottom: '1px solid #f0f0f0',
              gap: 4, overflow: 'hidden',
              cursor: isOpRow ? 'pointer' : 'default',
              background: hovered ? 'var(--es-n-50)' : 'transparent',
              transition: 'background 100ms',
            }}
          >
            {isOpRow && (
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--es-n-400)', flexShrink: 0 }}>
                {isCollapsed
                  ? <ChevronRight size={12} strokeWidth={1.5} />
                  : <ChevronDown  size={12} strokeWidth={1.5} />}
              </span>
            )}
            {isOpRow && (
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                backgroundColor: (t.styles as any)?.backgroundColor ?? '#9CA3AF',
              }} />
            )}
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontWeight: isOpRow ? 600 : 400,
              color: isOpRow ? 'var(--es-n-700)' : 'var(--es-n-500)',
            }}>
              {t.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function GanttCard({ cases, profiles, loading }: {
  cases:    ShipmentCase[]
  profiles: Profile[]
  loading:  boolean
}) {
  const [period, setPeriod] = useState<PeriodKey>('1M')
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set())
  const nowMs = useRef(Date.now())
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map((p, i) => [p.id, { profile: p, color: OPERATOR_COLORS[i % OPERATOR_COLORS.length] }])),
    [profiles],
  )

  const tasks: Task[] = useMemo(() => {
    const cutoff = nowMs.current - PERIOD_CUTOFF_MS[period]
    const nowDate = new Date(nowMs.current)

    const filtered = cases
      .filter(c => +new Date(c.created_at) >= cutoff || isActive(c))
      .slice(0, 200)

    const byOp = new Map<string, { opName: string; color: string; cases: ShipmentCase[] }>()
    for (const c of filtered) {
      const op     = c.operator_id ? profileMap[c.operator_id] : null
      const opName = op?.profile.display_name ?? op?.profile.email ?? 'Unassigned'
      const opKey  = c.operator_id ?? '__unassigned__'
      const color  = op?.color ?? '#9CA3AF'
      if (!byOp.has(opKey)) byOp.set(opKey, { opName, color, cases: [] })
      byOp.get(opKey)!.cases.push(c)
    }

    const futureMs = period === '1W' ? 30 * 86_400_000 : 5 * 7 * 86_400_000
    const result: Task[] = []
    for (const [opKey, { opName, color, cases: opCases }] of byOp) {
      const starts = opCases.map(c => +new Date(c.created_at))
      const ends   = opCases.map(c => {
        const s = +new Date(c.created_at)
        const e = isActive(c) ? nowMs.current : +new Date(c.updated_at)
        return e > s ? e : s + 86_400_000
      })
      const parentId = `op-${opKey}`
      result.push({
        id: parentId, type: 'project', name: opName,
        start: new Date(Math.min(...starts)),
        end:   new Date(Math.max(...ends) + futureMs),
        progress: 0,
        hideChildren: !expandedOps.has(parentId),
        styles: { backgroundColor: color, backgroundSelectedColor: color, progressColor: color, progressSelectedColor: color },
      })
      for (const c of opCases) {
        const ref   = c.ref_number ?? c.case_code ?? c.id.slice(0, 8)
        const start = new Date(c.created_at)
        let end = isActive(c) ? nowDate : new Date(c.updated_at)
        if (end <= start) end = new Date(start.getTime() + 86_400_000)
        result.push({
          id: c.id, type: 'task' as const, name: ref, project: parentId,
          start, end,
          progress: isActive(c) ? 50 : 100,
          styles: { backgroundColor: color, backgroundSelectedColor: color, progressColor: color, progressSelectedColor: color },
        })
      }
    }

    return result
  }, [cases, period, profileMap, expandedOps])

  const handleExpanderClick = useCallback((task: Task) => {
    setExpandedOps(prev => {
      const next = new Set(prev)
      if (next.has(task.id)) next.delete(task.id)
      else next.add(task.id)
      return next
    })
  }, [])

  const caseCount = tasks.filter(t => t.type === 'task').length

  const visibleRowCount = tasks.filter(t =>
    t.type === 'project' || expandedOps.has((t as any).project as string)
  ).length

  const colWidth = useMemo(() => {
    if (!containerWidth) return 100
    return period === '1W' ? 65 : 120
  }, [containerWidth, period])

  const viewDate = useMemo(
    () => tasks.length > 0 ? new Date(Math.min(...tasks.map(t => t.start.getTime()))) : undefined,
    [tasks],
  )

  return (
    <div className="es-card" ref={containerRef}>
      <div className="es-card__header">
        <Calendar size={13} strokeWidth={1.5} />
        <CardTip title="Case Timeline" tip="Gantt view of all cases by operator showing open and close dates" />
        <span className="es-card__subtitle">{caseCount} cases</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          {(['1W','1M','3M'] as PeriodKey[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{
                padding: '2px 7px', fontSize: 10, fontWeight: period === p ? 700 : 400,
                background: period === p ? 'var(--es-brand-light)' : 'transparent',
                color:      period === p ? 'var(--es-brand-text)' : 'var(--es-n-400)',
                border:     period === p ? '1px solid var(--es-brand-border)' : '1px solid var(--es-n-100)',
                borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '10px 16px 14px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="es-skeleton" style={{ height: 28, marginBottom: 6, borderRadius: 3 }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 16px' }}>No cases in this period</div>
      ) : (
        <div
          className="gantt-timeline"
          style={{ fontSize: 11, fontFamily: 'Figtree, sans-serif', padding: '8px 16px 0' }}
        >
          <Gantt
            tasks={tasks}
            viewMode={PERIOD_VIEW[period]}
            listCellWidth="180px"
            columnWidth={colWidth}
            rowHeight={34}
            fontSize="11px"
            todayColor="rgba(91,78,232,0.06)"
            preStepsCount={period === '1W' ? 30 : 12}
            viewDate={viewDate}
            barCornerRadius={3}
            headerHeight={44}
            ganttHeight={visibleRowCount * 34}
            TaskListHeader={GanttListHeader}
            TaskListTable={GanttListTable}
            onExpanderClick={handleExpanderClick}
          />
        </div>
      )}
    </div>
  )
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const [teamKpis,     setTeamKpis]     = useState<TeamKpi[]>([])
  const [profiles,     setProfiles]     = useState<Profile[]>([])
  const [vendors,      setVendors]      = useState<Vendor[]>([])
  const [orgOperators, setOrgOperators] = useState<OrgOperator[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    let alive = true
    async function load() {
      const [
        { data: teamKpisData },
        { data: profilesData },
        { data: vendorsData },
        { data: orgOpsData },
      ] = await Promise.all([
        supabase.rpc('get_team_kpis'),
        supabase.from('profiles').select('*'),
        supabase.from('vendors').select('*'),
        supabase.rpc('get_org_operators'),
      ])
      if (!alive) return
      setTeamKpis((teamKpisData as TeamKpi[]) ?? [])
      setProfiles(profilesData ?? [])
      setVendors(vendorsData ?? [])
      setOrgOperators((orgOpsData as OrgOperator[]) ?? [])
      setLoading(false)

      // Heartbeat — stamp presence so the online indicator reflects active managers
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        supabase.from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id)
          .then(() => {})
      }
    }
    load()
    return () => { alive = false }
  }, [])

  async function handleAddOperator(operatorId: string) {
    await supabase.from('manager_team_members').insert({ operator_id: operatorId })
    const [{ data: kpis }, { data: ops }] = await Promise.all([
      supabase.rpc('get_team_kpis'),
      supabase.rpc('get_org_operators'),
    ])
    setTeamKpis((kpis as TeamKpi[]) ?? [])
    setOrgOperators((ops as OrgOperator[]) ?? [])
  }

  async function handleRemoveOperator(operatorId: string) {
    await supabase.from('manager_team_members').delete().eq('operator_id', operatorId)
    const [{ data: kpis }, { data: ops }] = await Promise.all([
      supabase.rpc('get_team_kpis'),
      supabase.rpc('get_org_operators'),
    ])
    setTeamKpis((kpis as TeamKpi[]) ?? [])
    setOrgOperators((ops as OrgOperator[]) ?? [])
  }

  return (
    <main className="dashboard-main">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 10, alignItems: 'stretch' }}>
        <KpiBar teamKpis={teamKpis} />
        <PipelineFunnel cases={[]} compact />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'stretch' }}>
        <AlertsPanel cases={[]} emails={[]} loading={loading} />
        <OperatorTable kpis={teamKpis} orgOperators={orgOperators} loading={loading} onAdd={handleAddOperator} onRemove={handleRemoveOperator} />
      </div>
      <GanttCard cases={[]} profiles={profiles} loading={loading} />
      <KanbanBoard cases={[]} profiles={profiles} loading={loading} />
      <CasesTable cases={[]} vendors={vendors} profiles={profiles} loading={loading} />
      <VolumeTrend allCases={[]} profiles={profiles} selected="all" />
    </main>
  )
}
