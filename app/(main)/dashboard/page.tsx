'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase, EmailMessage, DraftTask } from '@/lib/types'
import { formatDate, formatRef, slaStatus } from '@/lib/utils'
import {
  Activity, AlertTriangle, CheckCircle2, Clock,
  Mail, FileWarning, ArrowRight, RefreshCw, Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Status pipeline config ───────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'new',              label: 'New',        color: 'bg-slate-400'   },
  { key: 'vendor_requested', label: 'Vendor Req', color: 'bg-blue-400'    },
  { key: 'quote_received',   label: 'Quote Rcvd', color: 'bg-slate-500'   },
  { key: 'quote_sent',       label: 'Quote Sent', color: 'bg-indigo-400'  },
  { key: 'client_confirmed', label: 'Confirmed',  color: 'bg-teal-500'    },
  { key: 'in_transit',       label: 'In Transit', color: 'bg-blue-500'    },
]

// ─── SLA dot ─────────────────────────────────────────────────────────────────

function SlaDot({ status }: { status: 'ok' | 'warning' | 'overdue' }) {
  const colors = { ok: 'bg-teal-400', warning: 'bg-slate-400', overdue: 'bg-rose-500 animate-pulse' }
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`} />
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new:               'bg-slate-100 text-slate-600',
    vendor_requested:  'bg-blue-50 text-blue-700',
    quote_received:    'bg-slate-100 text-slate-700',
    quote_sent:        'bg-indigo-50 text-indigo-700',
    client_confirmed:  'bg-teal-50 text-teal-700',
    vendor_confirmed:  'bg-slate-100 text-slate-700',
    label_received:    'bg-violet-50 text-violet-700',
    booked:            'bg-indigo-50 text-indigo-700',
    in_transit:        'bg-blue-50 text-blue-700',
    delivered:         'bg-slate-100 text-slate-700',
    closed:            'bg-gray-100 text-gray-500',
  }
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', map[status] || 'bg-gray-100 text-gray-600')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [cases,         setCases]         = useState<ShipmentCase[]>([])
  const [unmatched,     setUnmatched]     = useState<EmailMessage[]>([])
  const [pendingDrafts, setPending]       = useState<DraftTask[]>([])
  const [loading,       setLoading]       = useState(true)
  const [lastRefresh,   setLastRefresh]   = useState(new Date())

  async function load() {
    setLoading(true)
    const [{ data: casesData }, { data: unmatchedData }, { data: draftsData }] =
      await Promise.all([
        supabase.from('shipment_cases').select('*')
          .not('status', 'in', '("closed","delivered")')
          .order('updated_at', { ascending: false }),
        supabase.from('email_messages').select('*')
          .is('case_id', null).eq('folder', 'inbox')
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('draft_tasks').select('*')
          .eq('status', 'ready').order('priority', { ascending: false }),
      ])
    setCases(casesData || [])
    setUnmatched(unmatchedData || [])
    setPending(draftsData || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_cases' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_tasks' },   load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Derived stats
  const active   = cases.length
  const delayed  = cases.filter(c => slaStatus(c.updated_at, c.status) === 'overdue').length
  const critical = cases.filter(c => c.priority === 'urgent').length
  const needsAct = pendingDrafts.length + unmatched.length

  // Pipeline stage counts
  const stageCounts = PIPELINE_STAGES.map(s => ({
    ...s,
    count: cases.filter(c => c.status === s.key).length,
  }))

  // Cases needing action
  const actionCases = [...cases]
    .filter(c => slaStatus(c.updated_at, c.status) !== 'ok' || c.priority === 'urgent')
    .slice(0, 8)

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto h-full overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 font-display tracking-tight">Live Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-violet-600 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Compact KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Cases',     value: active,   icon: Activity,      color: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700'  },
          { label: 'Delayed',          value: delayed,  icon: Clock,         color: 'bg-slate-500',   light: 'bg-slate-100 text-slate-700'   },
          { label: 'Critical',         value: critical, icon: AlertTriangle, color: 'bg-rose-500',    light: 'bg-rose-50 text-rose-700'      },
          { label: 'Needs Attention',  value: needsAct, icon: FileWarning,   color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700'      },
        ].map(({ label, value, icon: Icon, color, light }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
              <Icon size={16} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none font-display">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status pipeline */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 font-display">
          Shipment Pipeline
        </p>
        <div className="grid grid-cols-6 gap-2">
          {stageCounts.map(stage => (
            <div key={stage.key} className="text-center">
              <div className={cn('h-1.5 rounded-full mb-2', stage.color, stage.count === 0 && 'opacity-20')} />
              <p className="text-xl font-bold text-gray-900 font-display leading-none">{stage.count}</p>
              <p className="text-[9px] text-gray-400 mt-1 font-medium uppercase tracking-wide leading-tight">{stage.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Cases needing action */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 font-display">
              Needs Action
            </h2>
            <Link href="/cases" className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium">
              All cases <ArrowRight size={11} />
            </Link>
          </div>

          {actionCases.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <CheckCircle2 size={28} className="mb-2 text-green-400" />
              <p className="text-xs">All cases on track</p>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {actionCases.map(c => {
              const sla = slaStatus(c.updated_at, c.status)
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.ref_number || c.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors group"
                >
                  <SlaDot status={sla} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 font-mono">
                        {formatRef(c.ref_number)}
                      </span>
                      <StatusBadge status={c.status} />
                      {c.priority === 'urgent' && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {c.origin && c.destination ? `${c.origin} → ${c.destination}` : c.client_email}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(c.updated_at)}</p>
                    {sla === 'overdue' && <p className="text-[10px] text-red-500 font-semibold">Overdue</p>}
                    {sla === 'warning' && <p className="text-[10px] text-amber-500 font-semibold">At risk</p>}
                  </div>
                  <ArrowRight size={13} className="text-gray-200 group-hover:text-violet-400 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Pending drafts */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 font-display flex items-center gap-1.5">
                <Sparkles size={11} className="text-violet-400" />
                AI Drafts
              </h2>
              <Link href="/drafts" className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium">
                View <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingDrafts.length === 0 && (
                <p className="text-xs text-gray-400 px-5 py-4 text-center">No pending drafts</p>
              )}
              {pendingDrafts.slice(0, 5).map(d => (
                <Link
                  key={d.id}
                  href={`/cases/${d.case_id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-violet-400 draft-pulse flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate capitalize">
                      {d.draft_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-gray-400 capitalize">{d.channel_type} channel</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Unmatched emails */}
          <div className="bg-white rounded-xl border border-amber-100 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-amber-50 bg-amber-50/50 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-700 font-display flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-amber-500" />
                Unmatched
              </h2>
              <Link href="/inbox?filter=unmatched" className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1 font-medium">
                Triage <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {unmatched.length === 0 && (
                <p className="text-xs text-gray-400 px-5 py-4 text-center">Inbox clear</p>
              )}
              {unmatched.slice(0, 5).map(m => (
                <Link
                  key={m.id}
                  href={`/inbox?filter=unmatched&id=${m.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-amber-50/40 transition-colors"
                >
                  <Mail size={12} className="text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{m.subject || '(no subject)'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{m.sender_email}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
