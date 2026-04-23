'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase } from '@/lib/types'
import { formatDate, formatRef, slaStatus } from '@/lib/utils'
import { Search, ArrowRight, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARS: Record<string, { bg: string; color: string }> = {
  new:               { bg: 'var(--es-n-50)',        color: 'var(--es-n-400)' },
  vendor_requested:  { bg: 'var(--es-info-bg)',      color: 'var(--es-info)' },
  quote_received:    { bg: 'var(--es-n-50)',         color: 'var(--es-n-500)' },
  quote_sent:        { bg: 'var(--es-brand-light)',  color: 'var(--es-brand-text)' },
  client_confirmed:  { bg: 'var(--es-ok-bg)',        color: 'var(--es-ok)' },
  vendor_confirmed:  { bg: 'var(--es-n-50)',         color: 'var(--es-n-500)' },
  label_received:    { bg: 'var(--es-brand-light)',  color: 'var(--es-brand-text)' },
  booked:            { bg: 'var(--es-brand-light)',  color: 'var(--es-brand-text)' },
  in_transit:        { bg: 'var(--es-info-bg)',      color: 'var(--es-info)' },
  delivered:         { bg: 'var(--es-ok-bg)',        color: 'var(--es-ok)' },
  closed:            { bg: 'var(--es-n-50)',         color: 'var(--es-n-300)' },
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Arial, sans-serif' }}>
      {/* Toolbar */}
      <div style={{ background: 'var(--es-n-0)', borderBottom: '1px solid var(--es-n-100)', padding: '0 20px', height: 48, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--es-n-700)', flexShrink: 0 }}>All Cases</span>

        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--es-n-300)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by Ref, client, route…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
              fontSize: 12, border: '1px solid var(--es-n-100)', borderRadius: 4,
              outline: 'none', fontFamily: 'Arial, sans-serif', color: 'var(--es-n-700)',
              background: 'var(--es-n-0)', boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            fontSize: 12, border: '1px solid var(--es-n-100)', borderRadius: 4,
            padding: '5px 10px', outline: 'none', fontFamily: 'Arial, sans-serif',
            color: 'var(--es-n-600)', background: 'var(--es-n-0)',
          }}
        >
          <option value="all">All statuses</option>
          {Object.keys(STATUS_VARS).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <span style={{ fontSize: 11, color: 'var(--es-n-300)', marginLeft: 'auto' }}>{filtered.length} cases</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--es-n-0)' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--es-n-25)', borderBottom: '1px solid var(--es-n-100)', position: 'sticky', top: 0 }}>
            <tr>
              {['Ref', 'Client', 'Route', 'Status', 'Priority', 'Updated', 'SLA', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--es-n-300)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--es-n-300)', fontSize: 13 }}>Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--es-n-300)', fontSize: 13 }}>No cases found</td></tr>
            )}
            {filtered.map(c => {
              const sla  = slaStatus(c.updated_at, c.status)
              const pill = STATUS_VARS[c.status] || { bg: 'var(--es-n-50)', color: 'var(--es-n-400)' }
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--es-n-50)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--es-n-25)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--es-n-900)' }}>{formatRef(c.ref_number)}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <p style={{ color: 'var(--es-n-700)', margin: 0 }}>{c.client_name || '—'}</p>
                    <p style={{ fontSize: 11, color: 'var(--es-n-300)', margin: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.client_email}</p>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--es-n-500)' }}>
                    {c.origin && c.destination ? `${c.origin} → ${c.destination}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="wb-list-status" style={{ background: pill.bg, color: pill.color }}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: c.priority === 'urgent' ? 'var(--es-urgent)'
                           : c.priority === 'high'   ? 'var(--es-high)'
                           : 'var(--es-n-400)',
                    }}>
                      {c.priority}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--es-n-400)' }}>{formatDate(c.updated_at)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {sla === 'overdue' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--es-urgent)' }}>
                        <AlertTriangle size={11} />Overdue
                      </span>
                    )}
                    {sla === 'warning' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--es-high)' }}>
                        <Clock size={11} />At risk
                      </span>
                    )}
                    {sla === 'ok' && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--es-ok)', display: 'inline-block' }} />
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link
                      href={`/cases/${c.ref_number || c.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--es-brand)', fontWeight: 600, textDecoration: 'none' }}
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
