'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase } from '@/lib/types'
import { formatDate, formatRef, slaStatus } from '@/lib/utils'
import { Search, Plus, ArrowRight, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_COLOR: Record<string, string> = {
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

export default function CasesPage() {
  const [cases, setCases] = useState<ShipmentCase[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase.from('shipment_cases').select('*').order('updated_at', { ascending: false })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data } = await query
      setCases(data || [])
      setLoading(false)
    }
    load()
  }, [statusFilter])

  const filtered = cases.filter(c =>
    !search ||
    c.ref_number?.includes(search) ||
    c.client_email?.toLowerCase().includes(search.toLowerCase()) ||
    c.origin?.toLowerCase().includes(search.toLowerCase()) ||
    c.destination?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <h1 className="text-sm font-semibold text-gray-900 flex-shrink-0">All Cases</h1>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Ref, client, route…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All statuses</option>
          {Object.keys(STATUS_COLOR).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <span className="text-xs text-gray-400 ml-auto">{filtered.length} cases</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Route</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SLA</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No cases found</td></tr>
            )}
            {filtered.map(c => {
              const sla = slaStatus(c.updated_at, c.status)
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className="font-semibold text-gray-900">{formatRef(c.ref_number)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-gray-800">{c.client_name || '—'}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">{c.client_email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {c.origin && c.destination ? `${c.origin} → ${c.destination}` : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[c.status] || 'bg-gray-100 text-gray-600')}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn('text-xs font-medium', {
                      'text-red-600':    c.priority === 'urgent',
                      'text-orange-500': c.priority === 'high',
                      'text-gray-500':   c.priority === 'normal' || c.priority === 'low',
                    })}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{formatDate(c.updated_at)}</td>
                  <td className="px-4 py-3.5">
                    {sla === 'overdue' && <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle size={11} />Overdue</span>}
                    {sla === 'warning' && <span className="flex items-center gap-1 text-xs text-amber-500"><Clock size={11} />At risk</span>}
                    {sla === 'ok'      && <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/cases/${c.ref_number || c.id}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Open <ArrowRight size={11} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
