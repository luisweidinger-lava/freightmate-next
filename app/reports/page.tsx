'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase, MessageDraft, ShipmentEvent } from '@/lib/types'
import { BarChart2, TrendingUp, Clock, DollarSign, Zap, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Tiny bar chart component (no Recharts dep needed for MVP) ────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{value}</span>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('p-2.5 rounded-lg', color)}>
        <Icon size={17} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Weekly volume bar chart ──────────────────────────────────────────────────

function WeeklyVolume({ cases }: { cases: ShipmentCase[] }) {
  // Build last-7-days buckets
  const days: { label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = d.toLocaleDateString('en-GB', { weekday: 'short' })
    const dateStr = d.toDateString()
    const count = cases.filter(c => new Date(c.created_at).toDateString() === dateStr).length
    days.push({ label, count })
  }
  const max = Math.max(...days.map(d => d.count), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Cases Created — Last 7 Days</h3>
      <div className="space-y-2.5">
        {days.map(({ label, count }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-8">{label}</span>
            <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden flex items-center">
              <div
                className="h-full bg-blue-500 rounded transition-all"
                style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-4 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Status distribution ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:               'bg-gray-400',
  vendor_requested:  'bg-blue-500',
  quote_received:    'bg-yellow-500',
  quote_sent:        'bg-indigo-500',
  client_confirmed:  'bg-green-500',
  vendor_confirmed:  'bg-teal-500',
  label_received:    'bg-purple-500',
  booked:            'bg-emerald-500',
  in_transit:        'bg-orange-500',
  delivered:         'bg-green-600',
  closed:            'bg-gray-300',
}

function StatusDistribution({ cases }: { cases: ShipmentCase[] }) {
  const counts: Record<string, number> = {}
  cases.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1 })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(e => e[1]), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Cases by Status</h3>
      <div className="space-y-2.5">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-32 truncate">{status.replace(/_/g, ' ')}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', STATUS_COLORS[status] || 'bg-gray-400')}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-4 text-right">{count}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
      </div>
    </div>
  )
}

// ─── Priority distribution ────────────────────────────────────────────────────

function PriorityDistribution({ cases }: { cases: ShipmentCase[] }) {
  const order = ['urgent', 'high', 'normal', 'low']
  const colors: Record<string, string> = {
    urgent: 'bg-red-500', high: 'bg-orange-500', normal: 'bg-blue-400', low: 'bg-gray-300',
  }
  const counts = order.map(p => ({
    label: p,
    count: cases.filter(c => c.priority === p).length,
  }))
  const max = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Cases by Priority</h3>
      <div className="space-y-3">
        {counts.map(({ label, count }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 capitalize w-14">{label}</span>
            <MiniBar value={count} max={max} color={colors[label]} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI token spend ───────────────────────────────────────────────────────────

function AISpend({ drafts }: { drafts: MessageDraft[] }) {
  const HAIKU_INPUT_COST  = 0.80  / 1_000_000  // $0.80 per 1M tokens
  const HAIKU_OUTPUT_COST = 4.00  / 1_000_000
  const SONNET_INPUT_COST = 3.00  / 1_000_000
  const SONNET_OUTPUT_COST= 15.00 / 1_000_000

  const sonnetDrafts = drafts.filter(d => d.model_used?.includes('sonnet'))
  const haikuDrafts  = drafts.filter(d => d.model_used?.includes('haiku'))

  const sonnetCost = sonnetDrafts.reduce((n, d) =>
    n + (d.prompt_tokens || 0) * SONNET_INPUT_COST + (d.completion_tokens || 0) * SONNET_OUTPUT_COST, 0)
  const haikuCost = haikuDrafts.reduce((n, d) =>
    n + (d.prompt_tokens || 0) * HAIKU_INPUT_COST + (d.completion_tokens || 0) * HAIKU_OUTPUT_COST, 0)

  const totalCost  = sonnetCost + haikuCost
  const totalTokens = drafts.reduce((n, d) => n + (d.prompt_tokens || 0) + (d.completion_tokens || 0), 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap size={14} className="text-purple-500" />
        AI Usage (All Time)
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total cost</span>
          <span className="font-semibold text-gray-900">${totalCost.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total tokens</span>
          <span className="font-medium text-gray-700">{totalTokens.toLocaleString()}</span>
        </div>
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Sonnet (drafts) — {sonnetDrafts.length} calls</span>
            <span className="text-gray-700">${sonnetCost.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Haiku (extraction) — {haikuDrafts.length} calls</span>
            <span className="text-gray-700">${haikuCost.toFixed(4)}</span>
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg px-3 py-2 text-xs text-purple-700 mt-1">
          Avg cost per draft: ${drafts.length > 0 ? (totalCost / drafts.length).toFixed(4) : '0.0000'}
        </div>
      </div>
    </div>
  )
}

// ─── Draft approval stats ─────────────────────────────────────────────────────

function DraftStats({ drafts }: { drafts: MessageDraft[] }) {
  const total    = drafts.length
  const sent     = drafts.filter(d => d.sent_at).length
  const approved = drafts.filter(d => d.approved_at && !d.rejected_at).length
  const rejected = drafts.filter(d => d.rejected_at).length
  const pending  = drafts.filter(d => !d.approved_at && !d.rejected_at).length

  const avgLatency = drafts.filter(d => d.latency_ms).length > 0
    ? Math.round(drafts.reduce((n, d) => n + (d.latency_ms || 0), 0) / drafts.filter(d => d.latency_ms).length)
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Draft Performance</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total drafts',    value: total,    color: 'text-gray-900' },
          { label: 'Sent',            value: sent,     color: 'text-green-600' },
          { label: 'Pending approval',value: pending,  color: 'text-amber-600' },
          { label: 'Rejected',        value: rejected, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className={cn('text-xl font-bold', color)}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {avgLatency > 0 && (
        <p className="text-xs text-gray-500 mt-3">
          Avg generation time: <span className="font-medium text-gray-700">{(avgLatency / 1000).toFixed(1)}s</span>
        </p>
      )}
    </div>
  )
}

// ─── Recent events feed ───────────────────────────────────────────────────────

function RecentEvents({ events }: { events: ShipmentEvent[] }) {
  const EVENT_COLORS: Record<string, string> = {
    email_received: 'bg-blue-100 text-blue-700',
    email_sent:     'bg-green-100 text-green-700',
    draft_approved: 'bg-indigo-100 text-indigo-700',
    draft_rejected: 'bg-red-100 text-red-700',
    status_changed: 'bg-yellow-100 text-yellow-700',
    error:          'bg-red-100 text-red-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent System Events</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.length === 0 && <p className="text-xs text-gray-400">No events yet</p>}
        {events.map(ev => (
          <div key={ev.id} className="flex items-start gap-2.5">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5',
              EVENT_COLORS[ev.event_type] || 'bg-gray-100 text-gray-600'
            )}>
              {ev.event_type.replace(/_/g, ' ')}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">
                {new Date(ev.created_at).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
              {ev.error_detail && (
                <p className="text-xs text-red-500 mt-0.5 truncate">{ev.error_detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [cases,  setCases]  = useState<ShipmentCase[]>([])
  const [drafts, setDrafts] = useState<MessageDraft[]>([])
  const [events, setEvents] = useState<ShipmentEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [casesRes, draftsRes, eventsRes] = await Promise.all([
        supabase.from('shipment_cases').select('*').order('created_at', { ascending: false }),
        supabase.from('message_drafts').select('*').order('created_at', { ascending: false }),
        supabase.from('shipment_events').select('*').order('created_at', { ascending: false }).limit(50),
      ])
      setCases(casesRes.data  || [])
      setDrafts(draftsRes.data || [])
      setEvents(eventsRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Aggregate metrics
  const activeCases  = cases.filter(c => !['delivered','closed'].includes(c.status)).length
  const bookedCases  = cases.filter(c => c.status === 'booked' || c.status === 'in_transit').length
  const totalRevenue = cases
    .filter(c => c.rate_amount)
    .reduce((n, c) => n + (c.rate_amount || 0), 0)
  const conversionRate = cases.length > 0
    ? Math.round((cases.filter(c => ['booked','in_transit','delivered'].includes(c.status)).length / cases.length) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <BarChart2 size={16} className="text-gray-400" />
        <h1 className="text-sm font-semibold text-gray-900">Reports & Analytics</h1>
        <span className="text-xs text-gray-400 ml-auto">All time · {cases.length} cases total</span>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          <KPI
            label="Active Cases"
            value={activeCases}
            sub={`of ${cases.length} total`}
            icon={Package}
            color="bg-blue-500"
          />
          <KPI
            label="Booked / In Transit"
            value={bookedCases}
            icon={TrendingUp}
            color="bg-emerald-500"
          />
          <KPI
            label="Conversion Rate"
            value={`${conversionRate}%`}
            sub="requests → booked"
            icon={Clock}
            color="bg-indigo-500"
          />
          <KPI
            label="Total Rate Value"
            value={totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : '—'}
            sub="booked cases"
            icon={DollarSign}
            color="bg-green-500"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">
          <WeeklyVolume cases={cases} />
          <StatusDistribution cases={cases} />
          <PriorityDistribution cases={cases} />
        </div>

        {/* AI + Drafts row */}
        <div className="grid grid-cols-3 gap-4">
          <AISpend drafts={drafts} />
          <DraftStats drafts={drafts} />
          <RecentEvents events={events} />
        </div>

      </div>
    </div>
  )
}
