'use client'

import { useEffect, useRef, useState, use } from 'react'
import Link from 'next/link'
import { ChevronLeft, RefreshCw, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase, CaseChannel, EmailMessage, MessageDraft, ThreadSummary } from '@/lib/types'
import { formatRef } from '@/lib/utils'
import { WorkbenchThreadCol } from '@/components/workbench/WorkbenchThreadCol'
import { IntelPanel } from '@/components/workbench/IntelPanel'

const INTEL_KEY = 'wb_intel_open'

function loadIntelOpen(): boolean {
  try { return localStorage.getItem(INTEL_KEY) !== 'false' } catch { return true }
}

export default function CaseWorkbenchPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params)

  const [shipmentCase,    setCase]    = useState<ShipmentCase | null>(null)
  const [channels,        setChannels] = useState<CaseChannel[]>([])
  const [msgsByChannel,   setMsgs]    = useState<Record<string, EmailMessage[]>>({})
  const [draftsByChannel, setDrafts]  = useState<Record<string, MessageDraft[]>>({})
  const [summary,         setSummary] = useState<ThreadSummary | null>(null)
  const [loading,         setLoading] = useState(true)
  const [activeDot,       setActiveDot] = useState(0)
  const [intelOpen,       setIntelOpen] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Load intel panel open state from localStorage after mount
  useEffect(() => { setIntelOpen(loadIntelOpen()) }, [])

  function toggleIntel() {
    setIntelOpen(v => {
      const next = !v
      try { localStorage.setItem(INTEL_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }

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

    const chans     = channelsData || []
    const allMsgs   = msgsData     || []
    const allDrafts = draftsData   || []

    setChannels(chans)

    const msgMap:   Record<string, EmailMessage[]>  = {}
    const draftMap: Record<string, MessageDraft[]>  = {}
    for (const ch of chans) {
      msgMap[ch.id] = allMsgs.filter(m =>
        m.channel_id === ch.id ||
        (m.channel_id === null && (m.sender_email === ch.party_email || m.recipient_email === ch.party_email))
      )
      draftMap[ch.id] = allDrafts.filter(d => d.channel_type === ch.channel_type)
    }
    setMsgs(msgMap)
    setDrafts(draftMap)
    setSummary(summaryData || null)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const rt = supabase.channel('wb-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_drafts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_channels'  }, load)
      .subscribe()
    return () => { supabase.removeChannel(rt) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  function handleCarouselScroll() {
    const el = carouselRef.current
    if (!el || channels.length === 0) return
    setActiveDot(Math.min(Math.round(el.scrollLeft / 348), channels.length - 1))
  }

  function scrollToCol(i: number) {
    carouselRef.current?.scrollTo({ left: i * 348, behavior: 'smooth' })
  }

  // ── Loading / not-found states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--es-n-25)' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--es-n-150)', borderTopColor: 'var(--es-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (!shipmentCase) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--es-n-300)' }}>
        <p style={{ fontSize: 13 }}>Case not found: {ref}</p>
        <Link href="/cases" style={{ fontSize: 12, color: 'var(--es-brand)', marginTop: 8 }}>← Back to cases</Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Case context bar — sits just below TitleBar inside the content column */}
      <div className="wb-topbar">
        <Link href="/cases" className="wb-topbar-btn" title="All cases">
          <ChevronLeft size={15} />
        </Link>

        <span className="wb-topbar-ref">{formatRef(shipmentCase.ref_number)}</span>

        {shipmentCase.origin && shipmentCase.destination && (
          <span className="wb-topbar-route">{shipmentCase.origin} → {shipmentCase.destination}</span>
        )}

        <span className="wb-topbar-pill">{shipmentCase.status.replace(/_/g, ' ')}</span>

        {shipmentCase.priority === 'urgent' && (
          <span className="wb-topbar-pill urgent">Urgent</span>
        )}

        {shipmentCase.client_name && (
          <span style={{ fontSize: 12, color: 'var(--es-n-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
            {shipmentCase.client_name}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={load} className="wb-topbar-btn" title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button onClick={toggleIntel} className="wb-topbar-btn" title={intelOpen ? 'Hide intel panel' : 'Show intel panel'}>
            {intelOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          </button>
        </div>
      </div>

      {/* Main body: carousel + intel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'var(--es-n-25)' }}>

        {/* Thread carousel + dots */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
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

        {/* Intel panel — collapsible */}
        {intelOpen && (
          <div style={{ width: 240, flexShrink: 0, borderLeft: '1px solid var(--es-n-100)', display: 'flex', flexDirection: 'column', background: 'var(--es-n-0)' }}>
            <IntelPanel shipmentCase={shipmentCase} summary={summary} />
          </div>
        )}

      </div>
    </div>
  )
}
