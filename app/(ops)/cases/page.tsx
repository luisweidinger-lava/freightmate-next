// DASHBOARD FILTERS ACCEPTED
// ?filter=delayed        → pre-filter to isDelayed cases
// ?filter=critical       → pre-filter to isCritical cases
// ?filter=silent         → pre-filter to isGoneSilent cases
// ?stage=<key>           → pre-filter to pipeline stage statuses
// ?period=today|tomorrow|this_week|overdue → flight date filter
// (read via useSearchParams on mount, applied to local filter state)
'use client'

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Package, Search, X, ChevronDown, Filter, ArrowRight, MessageCircleOff,
  AlertTriangle, Printer, MoreHorizontal, Briefcase,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'
import { formatDateShort, formatRelTime, isSameDay } from '@/lib/utils'
import type { ShipmentCase, CaseStatus } from '@/lib/types'

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

// ── Status display ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<CaseStatus, string> = {
  new: 'New', vendor_requested: 'Vendor Req.', quote_received: 'Quote Rcvd',
  quote_sent: 'Quote Sent', client_confirmed: 'Client Conf.', vendor_confirmed: 'Vendor Conf.',
  label_received: 'Label Rcvd', booked: 'Booked', in_transit: 'In Transit',
  delivered: 'Delivered', closed: 'Closed',
}
const STATUS_VARIANT: Record<CaseStatus, string> = {
  new: 'neutral', vendor_requested: 'neutral', quote_received: 'neutral', quote_sent: 'neutral',
  client_confirmed: 'blue', vendor_confirmed: 'blue', label_received: 'blue', booked: 'blue',
  in_transit: 'blue', delivered: 'green', closed: 'green',
}

const statusLabel   = (s: string) => STATUS_LABEL[s as CaseStatus] ?? s
const statusVariant = (s: string) => STATUS_VARIANT[s as CaseStatus] ?? 'neutral'

function urgencyBadge(p: string) {
  if (p === 'urgent' || p === 'high') return <span className="es-badge es-badge--red">High</span>
  if (p === 'normal')                 return <span className="es-badge es-badge--neutral">Normal</span>
  return <span className="es-badge es-badge--neutral" style={{ opacity: 0.6 }}>Low</span>
}

// ── Filter config ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: CaseStatus; label: string; badge: string }[] = [
  { value: 'new',              label: 'New',           badge: 'neutral' },
  { value: 'vendor_requested', label: 'Vendor Req.',   badge: 'neutral' },
  { value: 'quote_received',   label: 'Quote Rcvd',    badge: 'neutral' },
  { value: 'quote_sent',       label: 'Quote Sent',    badge: 'neutral' },
  { value: 'client_confirmed', label: 'Client Conf.',  badge: 'blue' },
  { value: 'vendor_confirmed', label: 'Vendor Conf.',  badge: 'blue' },
  { value: 'label_received',   label: 'Label Rcvd',    badge: 'blue' },
  { value: 'booked',           label: 'Booked',        badge: 'blue' },
  { value: 'in_transit',       label: 'In Transit',    badge: 'blue' },
  { value: 'delivered',        label: 'Delivered',     badge: 'green' },
  { value: 'closed',           label: 'Closed',        badge: 'green' },
]
const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Urgent',  badge: 'red'     },
  { value: 'high',   label: 'High',    badge: 'red'     },
  { value: 'normal', label: 'Normal',  badge: 'neutral' },
  { value: 'low',    label: 'Low',     badge: 'neutral' },
]
const FLAG_OPTIONS = [
  { value: 'delayed',  label: 'Delayed'     },
  { value: 'critical', label: 'Critical'    },
  { value: 'silent',   label: 'Gone Silent' },
]
const PERIOD_OPTIONS = [
  { value: 'today',     label: 'Departing today'    },
  { value: 'tomorrow',  label: 'Departing tomorrow' },
  { value: 'this_week', label: 'This week'          },
  { value: 'overdue',   label: 'Overdue'            },
]
const SORT_OPTIONS = [
  { value: 'flight_date', label: 'Flight Date'  },
  { value: 'created_at',  label: 'Created'      },
  { value: 'updated_at',  label: 'Last Updated' },
  { value: 'client_name', label: 'Client'       },
  { value: 'status',      label: 'Status'       },
]

// ── Derived logic ─────────────────────────────────────────────────────────────

const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const isDelayed    = (c: ShipmentCase) => !!c.flight_date && new Date(c.flight_date) < today0() && !CLOSED.includes(c.status as typeof CLOSED[number])
const isCritical   = (c: ShipmentCase) => ['urgent','high'].includes(c.priority) && isDelayed(c)
const isGoneSilent = (c: ShipmentCase) => {
  if (CLOSED.includes(c.status as typeof CLOSED[number])) return false
  if (!c.last_outbound_at) return true
  return Date.now() - new Date(c.last_outbound_at).getTime() > 48 * 3600000
}

// ── RibbonDropdown ────────────────────────────────────────────────────────────

interface DropdownOption { value: string; label: string; badge?: string }

function RibbonDropdown({ id, label, options, value, onChange, openId, setOpenId, multi = true }: {
  id: string; label: string; options: DropdownOption[]
  value: string[]; onChange: (v: string[]) => void
  openId: string | null; setOpenId: (id: string | null) => void
  multi?: boolean
}) {
  const isOpen = openId === id
  const count  = value.length
  const ref    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpenId(null) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [isOpen, setOpenId])

  function toggle(v: string) {
    if (multi) {
      onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
    } else {
      onChange(value[0] === v ? [] : [v])
      setOpenId(null)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`es-rbtn${count > 0 ? ' es-rbtn--filtered' : ''}`}
        onClick={() => setOpenId(isOpen ? null : id)}>
        {label}
        {count > 0 && <span className="ribbon-badge">{count}</span>}
        <ChevronDown size={10} style={{ opacity: 0.5, marginLeft: 1 }} strokeWidth={1.5} />
      </button>
      {isOpen && (
        <div className="ribbon-dd-panel">
          <div className="ribbon-dd-scroll">
            {options.map(opt => (
              <label key={opt.value} className="ribbon-dd-option">
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  checked={value.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  readOnly={false}
                />
                {opt.badge
                  ? <span className={`es-badge es-badge--${opt.badge}`}>{opt.label}</span>
                  : <span>{opt.label}</span>}
              </label>
            ))}
          </div>
          {count > 0 && (
            <button className="ribbon-dd-clear"
              onClick={() => { onChange([]); setOpenId(null) }}>
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Cases Ribbon ──────────────────────────────────────────────────────────────

interface Filters {
  status:  CaseStatus[]
  urgency: string[]
  flags:   string[]
  period:  string | null
}

function CasesRibbon({ filters, setFilters, sort, setSort, search, setSearch, total, filtered }: {
  filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>
  sort: { key: string; dir: 'asc' | 'desc' }
  setSort: React.Dispatch<React.SetStateAction<{ key: string; dir: 'asc' | 'desc' }>>
  search: string; setSearch: (s: string) => void
  total: number; filtered: number
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const set = (key: keyof Filters) => (val: string[]) =>
    setFilters(f => ({ ...f, [key]: key === 'period' ? (val[0] ?? null) : val }))

  const sortLabel = SORT_OPTIONS.find(s => s.value === sort.key)?.label ?? 'Sort'

  return (
    <div className="es-ribbon" style={{ position: 'relative', zIndex: 200, overflow: 'visible' }}>
      <div className="es-ribbon-group">
        <button className="es-rbtn primary" aria-label="New case (not yet implemented)">
          <Package size={13} strokeWidth={1.5} /> New Case
          <ChevronDown size={10} style={{ marginLeft: 2, opacity: 0.75 }} strokeWidth={1.5} />
        </button>
      </div>

      <div className="es-ribbon-group">
        <div className="ribbon-search">
          <Search size={12} strokeWidth={1.5} style={{ color: 'var(--es-n-400)', flexShrink: 0 }} />
          <input placeholder="Search ref, client, route…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="ribbon-search-x" onClick={() => setSearch('')}>
              <X size={11} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="es-ribbon-group" style={{ gap: 3 }}>
        <RibbonDropdown id="status"  label="Status"      options={STATUS_OPTIONS}  value={filters.status}  onChange={set('status')}  openId={openId} setOpenId={setOpenId} />
        <RibbonDropdown id="urgency" label="Urgency"     options={URGENCY_OPTIONS} value={filters.urgency} onChange={set('urgency')} openId={openId} setOpenId={setOpenId} />
        <RibbonDropdown id="flags"   label="Flags"       options={FLAG_OPTIONS}    value={filters.flags}   onChange={set('flags')}   openId={openId} setOpenId={setOpenId} />
        <RibbonDropdown id="period"  label="Flight Date" options={PERIOD_OPTIONS}  value={filters.period ? [filters.period] : []} onChange={set('period')} openId={openId} setOpenId={setOpenId} multi={false} />
      </div>

      <div className="es-ribbon-group">
        <RibbonDropdown
          id="sort" label={`Sort: ${sortLabel}`} options={SORT_OPTIONS}
          value={[sort.key]} onChange={v => v[0] && setSort(s => ({ ...s, key: v[0] }))}
          openId={openId} setOpenId={setOpenId} multi={false}
        />
        <button className="es-rbtn icon"
          title={sort.dir === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
          onClick={() => setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {sort.dir === 'asc'
              ? <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>
              : <><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></>}
          </svg>
        </button>
      </div>

      <div className="es-ribbon-group" style={{ marginLeft: 'auto', borderRight: 0 }}>
        <span className="ribbon-count-lbl">
          {filtered < total ? <><strong>{filtered}</strong> of {total}</> : <strong>{total}</strong>} case{total !== 1 ? 's' : ''}
        </span>
        <div className="es-vsep" />
        <button className="es-rbtn icon" title="Print" onClick={() => window.print()}><Printer size={14} strokeWidth={1.5} /></button>
        <button className="es-rbtn icon" title="More"><MoreHorizontal size={14} strokeWidth={1.5} /></button>
      </div>
    </div>
  )
}

// ── Active Filter Chips ───────────────────────────────────────────────────────

function ActiveFilters({ filters, search, setFilters, setSearch }: {
  filters: Filters; search: string
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  setSearch: (s: string) => void
}) {
  const chips: { label: string; clear: () => void }[] = []
  if (search) chips.push({ label: `"${search}"`, clear: () => setSearch('') })
  filters.status.forEach(v  => chips.push({ label: statusLabel(v), clear: () => setFilters(f => ({ ...f, status: f.status.filter(x => x !== v) })) }))
  filters.urgency.forEach(v => chips.push({ label: `Urgency: ${v}`, clear: () => setFilters(f => ({ ...f, urgency: f.urgency.filter(x => x !== v) })) }))
  filters.flags.forEach(v   => chips.push({ label: v[0].toUpperCase() + v.slice(1), clear: () => setFilters(f => ({ ...f, flags: f.flags.filter(x => x !== v) })) }))
  if (filters.period) {
    const opt = PERIOD_OPTIONS.find(o => o.value === filters.period)
    chips.push({ label: opt?.label ?? filters.period!, clear: () => setFilters(f => ({ ...f, period: null })) })
  }
  if (!chips.length) return null
  const clearAll = () => { setFilters({ status: [], urgency: [], flags: [], period: null }); setSearch('') }
  return (
    <div className="active-filters-row">
      <span className="active-filters-label"><Filter size={11} strokeWidth={1.5} /> Active filters:</span>
      <div className="active-filters-chips">
        {chips.map((c, i) => (
          <span key={i} className="es-chip">
            {c.label}
            <span className="es-chip__x" onClick={c.clear}><X size={10} strokeWidth={1.5} /></span>
          </span>
        ))}
      </div>
      <button className="clear-all-btn" onClick={clearAll}>Clear all</button>
    </div>
  )
}

// ── Summary Bar ───────────────────────────────────────────────────────────────

function SummaryBar({ all, filteredCount }: { all: ShipmentCase[]; filteredCount: number }) {
  const active   = all.filter(c => !CLOSED.includes(c.status as typeof CLOSED[number])).length
  const delayed  = all.filter(isDelayed).length
  const critical = all.filter(isCritical).length
  return (
    <div className="summary-bar">
      <span className="sb-stat"><span className="sb-num">{all.length}</span> total</span>
      <span className="sb-sep">·</span>
      <span className="sb-stat"><span className="sb-num">{active}</span> active</span>
      <span className="sb-sep">·</span>
      <span className="sb-stat sb-stat--warn"><span className="sb-num">{delayed}</span> delayed</span>
      <span className="sb-sep">·</span>
      <span className="sb-stat sb-stat--crit"><span className="sb-num">{critical}</span> critical</span>
      {filteredCount < all.length && <>
        <span className="sb-sep" style={{ margin: '0 8px' }}>|</span>
        <span className="sb-stat sb-stat--filtered">Showing <span className="sb-num">{filteredCount}</span> results</span>
      </>}
    </div>
  )
}

// ── Sortable TH ───────────────────────────────────────────────────────────────

function SortTh({ col, label, sort, setSort, style }: {
  col: string; label: string
  sort: { key: string; dir: 'asc' | 'desc' }
  setSort: React.Dispatch<React.SetStateAction<{ key: string; dir: 'asc' | 'desc' }>>
  style?: React.CSSProperties
}) {
  const active = sort.key === col
  return (
    <th style={style} className={active ? 'th-sorted' : ''}
      onClick={() => setSort(s => ({ key: col, dir: s.key === col && s.dir === 'asc' ? 'desc' : 'asc' }))}>
      <span className="th-inner">
        {label}
        <span className="th-sort">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.2 }}>↕</span>}
        </span>
      </span>
    </th>
  )
}

// ── Cases Table ───────────────────────────────────────────────────────────────

function CasesTable({ cases, sort, setSort, loading }: {
  cases: ShipmentCase[]
  sort: { key: string; dir: 'asc' | 'desc' }
  setSort: React.Dispatch<React.SetStateAction<{ key: string; dir: 'asc' | 'desc' }>>
  loading: boolean
}) {
  const router = useRouter()
  return (
    <div className="es-card cases-table-wrap">
      <div style={{ overflowX: 'auto' }}>
        <table className="es-table">
          <thead>
            <tr>
              <SortTh col="ref_number"  label="Ref"          sort={sort} setSort={setSort} style={{ width: 90 }} />
              <SortTh col="client_name" label="Client"       sort={sort} setSort={setSort} />
              <th className="th-nosort">Route</th>
              <SortTh col="status"      label="Status"       sort={sort} setSort={setSort} style={{ width: 124 }} />
              <th className="th-nosort" style={{ width: 82 }}>Priority</th>
              <SortTh col="flight_date" label="Flight Date"  sort={sort} setSort={setSort} style={{ width: 100 }} />
              <SortTh col="created_at"  label="Created"      sort={sort} setSort={setSort} style={{ width: 82 }} />
              <SortTh col="updated_at"  label="Last Contact" sort={sort} setSort={setSort} style={{ width: 108 }} />
              <th className="th-nosort" style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{[80,140,130,110,70,90,70,90,80].map((w, j) => (
                    <td key={j} style={{ padding: '9px 12px' }}>
                      <div className="es-skeleton" style={{ height: 11, width: w * (0.4 + Math.random() * 0.6) }} />
                    </td>
                  ))}</tr>
                ))
              : cases.length === 0
                ? <tr><td colSpan={9} className="empty-row">No cases match the current filters</td></tr>
                : cases.map(c => {
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
                        <td>{urgencyBadge(c.priority)}</td>
                        <td>
                          <span className={`cell-date${delayed ? ' cell-date--overdue' : ''}`}>
                            {formatDateShort(c.flight_date)}
                          </span>
                          {delayed && <span className="overdue-tag">late</span>}
                        </td>
                        <td><span className="cell-date">{formatDateShort(c.created_at)}</span></td>
                        <td>
                          <span className={`cell-time${silent ? ' cell-time--silent' : ''}`}>
                            {silent && <MessageCircleOff size={11} strokeWidth={1.5} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                            {formatRelTime(c.last_outbound_at)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: 10 }}>
                          <button className="open-wb-btn"
                            onClick={() => router.push(ROUTES.CASE(c.ref_number ?? c.id))}
                            title="Open in Workbench">
                            <Briefcase size={12} strokeWidth={1.5} />
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })
            }
          </tbody>
        </table>
      </div>
      {!loading && cases.length > 0 && (
        <div className="table-footer">
          <span style={{ color: 'var(--es-n-400)', fontSize: 11 }}>{cases.length} case{cases.length !== 1 ? 's' : ''} shown</span>
        </div>
      )}
    </div>
  )
}

// ── Inner page (needs Suspense for useSearchParams) ───────────────────────────

function CasesPageInner() {
  const params = useSearchParams()
  const [allCases, setAllCases] = useState<ShipmentCase[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filters,  setFilters]  = useState<Filters>({ status: [], urgency: [], flags: [], period: null })
  const [sort,     setSort]     = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'flight_date', dir: 'asc' })

  // Apply URL params from dashboard navigation on mount
  useEffect(() => {
    const filter = params.get('filter')
    const stage  = params.get('stage')
    const period = params.get('period')
    if (filter) setFilters(f => ({ ...f, flags: [filter] }))
    if (stage) {
      const s = PIPELINE_STAGES.find(p => p.key === stage)
      if (s) setFilters(f => ({ ...f, status: [...s.statuses] as CaseStatus[] }))
    }
    if (period) setFilters(f => ({ ...f, period }))
  }, []) // mount only

  // Reactive ?q= param — re-applies when TitleBar search pushes a new URL
  const qParam = params.get('q')
  useEffect(() => {
    if (qParam !== null) setSearch(qParam)
  }, [qParam])

  useEffect(() => {
    let mounted = true
    supabase.from('shipment_cases').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (mounted) { setAllCases(data ?? []); setLoading(false) } })
    return () => { mounted = false }
  }, [])

  const refreshCases = useCallback(async () => {
    const { data } = await supabase.from('shipment_cases').select('*').order('updated_at', { ascending: false })
    if (data) setAllCases(data)
  }, [])

  useEffect(() => {
    const ch = supabase.channel('cases-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_cases' }, refreshCases)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refreshCases])

  const filteredCases = useMemo(() => {
    let r = allCases
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(c => {
        const row = c as unknown as Record<string, string>
        return ['ref_number','client_name','case_code','origin','destination'].some(k => (row[k] ?? '').toLowerCase().includes(q))
      })
    }
    if (filters.status.length)  r = r.filter(c => filters.status.includes(c.status))
    if (filters.urgency.length) r = r.filter(c => filters.urgency.includes(c.priority))
    if (filters.flags.length) {
      r = r.filter(c => filters.flags.some(f =>
        f === 'delayed'  ? isDelayed(c) :
        f === 'critical' ? isCritical(c) :
        f === 'silent'   ? isGoneSilent(c) : false
      ))
    }
    if (filters.period) {
      const t0 = today0()
      const tom = new Date(t0); tom.setDate(t0.getDate() + 1)
      const wk  = new Date(t0); wk.setDate(t0.getDate() + 7)
      r = r.filter(c => {
        if (filters.period === 'overdue')    return isDelayed(c)
        if (!c.flight_date)                  return false
        const fd = new Date(c.flight_date)
        if (filters.period === 'today')      return isSameDay(fd, t0)
        if (filters.period === 'tomorrow')   return isSameDay(fd, tom)
        if (filters.period === 'this_week')  return fd >= t0 && fd <= wk
        return true
      })
    }
    return [...r].sort((a, b) => {
      const d = sort.dir === 'asc' ? 1 : -1
      const k = sort.key
      const ar = a as unknown as Record<string,string>
      const br = b as unknown as Record<string,string>
      if (k === 'client_name' || k === 'status')
        return d * (ar[k] ?? '').localeCompare(br[k] ?? '')
      const av = ar[k] ? new Date(ar[k]) : null
      const bv = br[k] ? new Date(br[k]) : null
      if (!av && !bv) return 0; if (!av) return 1; if (!bv) return -1
      return d * (av.getTime() - bv.getTime())
    })
  }, [allCases, search, filters, sort])

  return (
    <>
      <CasesRibbon
        filters={filters} setFilters={setFilters}
        sort={sort} setSort={setSort}
        search={search} setSearch={setSearch}
        total={allCases.length} filtered={filteredCases.length}
      />
      <main className="cases-main">
        <SummaryBar all={allCases} filteredCount={filteredCases.length} />
        <ActiveFilters filters={filters} search={search} setFilters={setFilters} setSearch={setSearch} />
        <CasesTable cases={filteredCases} sort={sort} setSort={setSort} loading={loading} />
      </main>
    </>
  )
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function CasesPage() {
  return (
    <Suspense>
      <CasesPageInner />
    </Suspense>
  )
}
