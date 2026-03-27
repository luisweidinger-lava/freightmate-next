'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase, EmailMessage, DraftTask } from '@/lib/types'
import { formatDate, formatRef, slaStatus } from '@/lib/utils'
import {
  Activity, AlertTriangle, CheckCircle2, Clock,
  Mail, FileWarning, ArrowRight, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: number | string; icon: React.ElementType
  color: string; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── SLA dot ─────────────────────────────────────────────────────────────────

function SlaDot({ status }: { status: 'ok' | 'warning' | 'overdue' }) {
  const colors = { ok: 'bg-green-400', warning: 'bg-amber-400', overdue: 'bg-red-500' }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new:               'bg-gray-100 text-gray-600',
    vendor_requested:  'bg-blue-50 text-blue-700',
    quote_received:    'bg-yellow-50 text-yellow-700',
    quote_sent:        'bg-indigo-50 text-indigo-700',
    client_confirmed:  'bg-green-50 text-green-700',
    vendor_confirmed:  'bg-teal-50 text-teal-700',
    label_received:    'bg-purple-50 text-purple-700',
    booked:            'bg-emerald-50 text-emerald-700',
    in_transit:        'bg-orange-50 text-orange-700',
    delivered:         'bg-green-100 text-green-800',
    closed:            'bg-gray-100 text-gray-500',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [cases, setCases]             = useState<ShipmentCase[]>([])
  const [unmatched, setUnmatched]     = useState<EmailMessage[]>([])
  const [pendingDrafts, setPending]   = useState<DraftTask[]>([])
  const [loading, setLoading]         = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  async function load() {
    setLoading(true)
    const [{ data: casesData }, { data: unmatchedData }, { data: draftsData }] =
      await Promise.all([
        supabase
          .from('shipment_cases')
          .select('*')
          .not('status', 'in', '("closed","delivered")')
          .order('updated_at', { ascending: false }),
        supabase
          .from('email_messages')
          .select('*')
          .is('case_id', null)
          .eq('folder', 'inbox')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('draft_tasks')
          .select('*')
          .eq('status', 'ready')
          .order('priority', { ascending: false }),
      ])

    setCases(casesData || [])
    setUnmatched(unmatchedData || [])
    setPending(draftsData || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    load()

    // Realtime subscription
    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_cases' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draft_tasks' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Derived stats
  const active   = cases.length
  const delayed  = cases.filter(c => slaStatus(c.updated_at, c.status) === 'overdue').length
  const critical = cases.filter(c => c.priority === 'urgent').length
  const needsAct = pendingDrafts.length + unmatched.length

  // Cases needing action (overdue SLA or pending draft or urgent)
  const actionCases = [...cases]
    .filter(c => slaStatus(c.updated_at, c.status) !== 'ok' || c.priority === 'urgent')
    .slice(0, 8)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Live Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Last updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Active Cases"     value={active}   icon={Activity}      color="bg-blue-500"   />
        <KPICard label="Delayed"          value={delayed}  icon={Clock}         color="bg-amber-500"  sub="SLA > 24h" />
        <KPICard label="Critical"         value={critical} icon={AlertTriangle} color="bg-red-500"    sub="Urgent priority" />
        <KPICard label="Needs Attention"  value={needsAct} icon={FileWarning}   color="bg-purple-500" sub="Drafts + unmatched" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Cases needing action */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Cases Needing Action</h2>
            <Link href="/cases" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {actionCases.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle2 size={32} className="mb-2 text-green-400" />
              <p className="text-sm">All cases on track</p>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {actionCases.map(c => {
              const sla = slaStatus(c.updated_at, c.status)
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.ref_number || c.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                >
                  <SlaDot status={sla} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatRef(c.ref_number)}
                      </span>
                      <StatusBadge status={c.status} />
                      {c.priority === 'urgent' && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {c.origin && c.destination ? `${c.origin} → ${c.destination}` : c.client_email}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatDate(c.updated_at)}</p>
                    {sla === 'overdue' && (
                      <p className="text-xs text-red-500 font-medium">Overdue</p>
                    )}
                    {sla === 'warning' && (
                      <p className="text-xs text-amber-500 font-medium">At risk</p>
                    )}
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Pending drafts */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Drafts Awaiting Approval</h2>
              <Link href="/drafts" className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                View all <ArrowRight size={11} />
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
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400 draft-pulse flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {d.draft_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400">{d.channel_type} channel</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Unmatched emails */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-50 bg-amber-50/60 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Unmatched Emails
              </h2>
              <Link href="/inbox?filter=unmatched" className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1">
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
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <Mail size={13} className="text-amber-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{m.subject || '(no subject)'}</p>
                    <p className="text-xs text-gray-400 truncate">{m.sender_email}</p>
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
