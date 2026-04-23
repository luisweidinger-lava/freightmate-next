'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ShipmentCase } from '@/lib/types'
import { formatDate, formatRef } from '@/lib/utils'

const STATUS_PILL_VARS: Record<string, { bg: string; color: string }> = {
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

export function CaseMiniList({ currentRef }: { currentRef: string | null }) {
  const [cases,   setCases]   = useState<ShipmentCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  async function fetchCases() {
    setLoading(true); setError(false)
    const { data, error: err } = await supabase
      .from('shipment_cases')
      .select('id, ref_number, status, client_name, priority, updated_at')
      .not('status', 'in', '("closed","delivered")')
      .order('updated_at', { ascending: false })
      .limit(40)
    if (err) { setError(true); setLoading(false); return }
    setCases((data || []) as ShipmentCase[])
    setLoading(false)
  }

  useEffect(() => { fetchCases() }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="wb-case-item" style={{ animation: 'pulse 1.5s infinite' }}>
            <div className="wb-skeleton-dot" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="wb-skeleton-line medium" />
              <div className="wb-skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', gap: 6 }}>
        <p style={{ fontSize: 12, color: 'var(--es-n-300)' }}>Failed to load</p>
        <button onClick={fetchCases} style={{ fontSize: 12, color: 'var(--es-brand)', background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 12px' }}>
        <p style={{ fontSize: 12, color: 'var(--es-n-200)' }}>No active cases</p>
      </div>
    )
  }

  return (
    <div>
      {cases.map(c => {
        const isCurrent = c.ref_number === currentRef
        const pillVars  = STATUS_PILL_VARS[c.status] || { bg: 'var(--es-n-50)', color: 'var(--es-n-400)' }
        return (
          <Link
            key={c.id}
            href={`/cases/${c.ref_number || c.id}`}
            className={`wb-case-item${isCurrent ? ' active' : ''}`}
          >
            <span className={`wb-priority-dot ${c.priority || 'normal'}`} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="wb-case-ref">{formatRef(c.ref_number)}</p>
              {c.client_name && <p className="wb-case-meta">{c.client_name}</p>}
              <div className="wb-case-footer">
                <span className="wb-case-status" style={{ background: pillVars.bg, color: pillVars.color }}>
                  {c.status.replace(/_/g, ' ')}
                </span>
                <span className="wb-case-ts">{formatDate(c.updated_at)}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
