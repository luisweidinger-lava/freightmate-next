'use client'

import { useEffect, useRef, useState, use } from 'react'
import Link from 'next/link'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase, CaseChannel, EmailMessage, MessageDraft, ThreadSummary } from '@/lib/types'
import { formatRef } from '@/lib/utils'
import { CaseMiniList } from '@/components/workbench/CaseMiniList'
import { WorkbenchThreadCol } from '@/components/workbench/WorkbenchThreadCol'
import { IntelPanel } from '@/components/workbench/IntelPanel'

export default function CaseWorkbenchPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params)

  const [shipmentCase, setCase]   = useState<ShipmentCase | null>(null)
  const [channels,     setChannels] = useState<CaseChannel[]>([])
  const [msgsByChannel, setMsgs]  = useState<Record<string, EmailMessage[]>>({})
  const [draftsByChannel, setDrafts] = useState<Record<string, MessageDraft[]>>({})
  const [summary, setSummary]     = useState<ThreadSummary | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeDot, setActiveDot] = useState(0)
  const carouselRef               = useRef<HTMLDivElement>(null)

  async function load() {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const { data: byRef } = await supabase.from('shipment_cases').select('*').eq('ref_number', ref).maybeSingle()
    const { data: byId }  = (!byRef && UUID_RE.test(ref))
      ? await supabase.from('shipment_cases').select('*').eq('id', ref).maybeSingle()
      : { data: null }
    const caseData = byRef || byId
    if (!caseData) { setLoading(false); return }
    setCase(caseData)

    const caseId = caseData.id

    const [
      { data: channelsData },
      { data: msgsData },
      { data: draftsData },
      { data: summaryData },
    ] = await Promise.all([
      supabase.from('case_channels').select('*').eq('case_id', caseId).order('position', { ascending: true }),
      supabase.from('email_messages').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
      supabase.from('message_drafts').select('*').eq('case_id', caseId).is('sent_at', null).is('rejected_at', null).order('created_at', { ascending: false }),
      supabase.from('thread_summaries').select('*').eq('case_id', caseId).maybeSingle(),
    ])

    const chans   = channelsData || []
    const allMsgs = msgsData     || []
    const allDrafts = draftsData || []

    setChannels(chans)

    const msgMap: Record<string, EmailMessage[]>  = {}
    const draftMap: Record<string, MessageDraft[]> = {}

    for (const ch of chans) {
      msgMap[ch.id] = allMsgs.filter(m => {
        if (m.channel_id === ch.id) return true
        if (m.channel_id === null) {
          return m.sender_email === ch.party_email || m.recipient_email === ch.party_email
        }
        return false
      })
      draftMap[ch.id] = allDrafts.filter(d => {
        if (d.channel_type === ch.channel_type) return true
        return false
      })
    }

    setMsgs(msgMap)
    setDrafts(draftMap)
    setSummary(summaryData || null)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const rt = supabase.channel('wb-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_drafts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_channels' }, load)
      .subscribe()
    return () => { supabase.removeChannel(rt) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  function handleCarouselScroll() {
    const el = carouselRef.current
    if (!el || channels.length === 0) return
    const colWidth = 348 // 340px + 8px gap
    const idx = Math.round(el.scrollLeft / colWidth)
    setActiveDot(Math.min(idx, channels.length - 1))
  }

  function scrollToCol(idx: number) {
    const el = carouselRef.current
    if (!el) return
    el.scrollTo({ left: idx * 348, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--es-n-25)' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--es-n-150)', borderTopColor: 'var(--es-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!shipmentCase) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--es-n-25)', color: 'var(--es-n-300)' }}>
        <p style={{ fontSize: 13 }}>Case not found: {ref}</p>
        <Link href="/cases" style={{ fontSize: 12, color: 'var(--es-brand)', marginTop: 8 }}>← Back to cases</Link>
      </div>
    )
  }

  return (
    <div className="wb-bg">
      {/* Top bar */}
      <div className="wb-topbar">
        <Link href="/cases" className="wb-topbar-btn"><ChevronLeft size={16} /></Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <span className="wb-topbar-ref">{formatRef(shipmentCase.ref_number)}</span>
          {shipmentCase.origin && shipmentCase.destination && (
            <span className="wb-topbar-route">{shipmentCase.origin} → {shipmentCase.destination}</span>
          )}
          <span className="wb-topbar-pill">{shipmentCase.status.replace(/_/g, ' ')}</span>
          {shipmentCase.priority === 'urgent' && <span className="wb-topbar-pill urgent">Urgent</span>}
          {shipmentCase.client_name && (
            <span style={{ fontSize: 12, color: 'var(--es-n-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {shipmentCase.client_name}
            </span>
          )}
        </div>
        <button onClick={load} className="wb-topbar-btn" title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {/* Main body: col1 (fixed) + carousel + col4 (fixed) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 8, padding: 8 }}>

        {/* Col 1: Case list (fixed) */}
        <div className="wb-panel" style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="wb-panel-header">
            <span className="wb-panel-title">Active Cases</span>
          </div>
          <div className="wb-panel-scroll">
            <CaseMiniList currentRef={shipmentCase.ref_number} />
          </div>
        </div>

        {/* Thread carousel + dots */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div
            className="wb-thread-carousel"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
          >
            {channels.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: 'var(--es-n-300)', fontSize: 13 }}>
                No channels yet
              </div>
            ) : channels.map(ch => (
              <WorkbenchThreadCol
                key={ch.id}
                channel={ch}
                messages={msgsByChannel[ch.id] || []}
                drafts={draftsByChannel[ch.id] || []}
                caseId={shipmentCase.id}
                caseRef={shipmentCase.ref_number}
                onAction={load}
              />
            ))}
          </div>
          {channels.length > 1 && (
            <div className="wb-dots">
              {channels.map((_, i) => (
                <div
                  key={i}
                  className={`wb-dot${i === activeDot ? ' active' : ''}`}
                  onClick={() => scrollToCol(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Col 4: Intel panel (fixed) */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <IntelPanel shipmentCase={shipmentCase} summary={summary} />
        </div>

      </div>
    </div>
  )
}
