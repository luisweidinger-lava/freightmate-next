'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, LayoutList } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase } from '@/lib/types'
import { formatRef } from '@/lib/utils'

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'var(--es-urgent)',
  high:   'var(--es-high)',
  normal: 'var(--es-n-200)',
  low:    'var(--es-n-100)',
}

const STATUS_BG: Record<string, string> = {
  new:              'var(--es-n-50)',
  vendor_requested: 'var(--es-info-bg)',
  quote_received:   'var(--es-n-50)',
  quote_sent:       'var(--es-brand-light)',
  client_confirmed: 'var(--es-ok-bg)',
  vendor_confirmed: 'var(--es-n-50)',
  label_received:   'var(--es-brand-light)',
  booked:           'var(--es-brand-light)',
  in_transit:       'var(--es-info-bg)',
  delivered:        'var(--es-ok-bg)',
  closed:           'var(--es-n-50)',
}

export default function CaseRail() {
  const pathname = usePathname()
  const [cases,   setCases]   = useState<ShipmentCase[]>([])
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(true)
  const [width,   setWidth]   = useState(220)

  const pathRef = pathname.startsWith('/cases/')
    ? pathname.split('/cases/')[1]?.split('/')[0] ?? null
    : null

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('shipment_cases')
        .select('id, ref_number, status, client_name, priority, updated_at')
        .not('status', 'in', '("closed","delivered")')
        .order('updated_at', { ascending: false })
        .limit(40)
      setCases((data || []) as ShipmentCase[])
      setLoading(false)
    }
    fetch()
    const ch = supabase.channel('case-rail')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipment_cases' }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    function onMove(ev: MouseEvent) { setWidth(Math.max(160, Math.min(360, startW + ev.clientX - startX))) }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="es-folder-rail" style={{ width, flexShrink: 0, position: 'relative' }}>
      <div className="es-folder-rail-scroll">
        <div className="es-rail-group">
          <div className="es-rail-group-header" onClick={() => setOpen(o => !o)}>
            {open
              ? <ChevronDown  size={11} style={{ color: 'var(--es-n-400)' }} />
              : <ChevronRight size={11} style={{ color: 'var(--es-n-400)' }} />}
            Active Cases
          </div>

          {open && loading && (
            <div style={{ padding: '8px 26px', fontSize: 11, color: 'var(--es-n-300)' }}>Loading…</div>
          )}

          {open && !loading && cases.length === 0 && (
            <div style={{ padding: '8px 26px', fontSize: 11, color: 'var(--es-n-300)' }}>No active cases</div>
          )}

          {open && cases.map(c => {
            const isActive = c.ref_number === pathRef || c.id === pathRef
            const statusBg = STATUS_BG[c.status] || 'var(--es-n-50)'
            return (
              <Link key={c.id} href={`/cases/${c.ref_number || c.id}`} style={{ display: 'block' }}>
                <div className={`es-rail-link${isActive ? ' active' : ''}`} style={{ paddingLeft: 16, alignItems: 'flex-start', gap: 6 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: PRIORITY_COLOR[c.priority || 'normal'],
                  }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatRef(c.ref_number)}
                    </span>
                    {c.client_name && (
                      <span style={{ display: 'block', fontSize: 10, color: isActive ? 'var(--es-brand-text)' : 'var(--es-n-300)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.client_name}
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                    padding: '1px 5px', borderRadius: 3, flexShrink: 0, marginTop: 1,
                    background: isActive ? 'rgba(91,130,173,0.15)' : statusBg,
                    color: isActive ? 'var(--es-brand-text)' : 'var(--es-n-400)',
                  }}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="es-user-status">
        <Link href="/cases" style={{ fontSize: 11, color: 'var(--es-n-400)', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
          <LayoutList size={11} /> All Cases
        </Link>
      </div>

      {/* Drag handle */}
      <div className="es-drag-handle" onMouseDown={startDrag} />
    </div>
  )
}
