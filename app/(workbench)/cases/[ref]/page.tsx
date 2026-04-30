'use client'

import React, { useEffect, useRef, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, RefreshCw, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ShipmentCase, CaseChannel, EmailMessage, MessageDraft, ThreadSummary } from '@/lib/types'
import { formatRef } from '@/lib/utils'
import { WorkbenchThreadCol } from '@/components/workbench/WorkbenchThreadCol'
import { IntelPanel } from '@/components/workbench/IntelPanel'
import { useUser } from '@/components/UserProvider'

const INTEL_KEY        = 'wb_intel_open'
const INTEL_FOLDED_KEY = 'wb_intel_folded'
const INTEL_WIDTH_KEY  = 'wb_intel_width'
const WIDTHS_KEY       = 'wb_col_widths'

function loadIntelOpen(): boolean {
  try { return localStorage.getItem(INTEL_KEY) !== 'false' } catch { return true }
}

function loadIntelFolded(): boolean {
  try { return localStorage.getItem(INTEL_FOLDED_KEY) === 'true' } catch { return false }
}

function loadIntelWidth(): number {
  try {
    const v = localStorage.getItem(INTEL_WIDTH_KEY)
    if (v) return Math.max(160, parseInt(v, 10))
  } catch { /* ignore */ }
  return 240
}

function loadColWidths(): number[] {
  try {
    const raw = localStorage.getItem(WIDTHS_KEY)
    if (raw) return JSON.parse(raw) as number[]
  } catch { /* ignore */ }
  return [50, 50]
}

function saveColWidths(widths: number[]) {
  try { localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths)) } catch { /* ignore */ }
}

function virtualChannel(caseId: string, type: 'client' | 'vendor' | 'other', pos: number): CaseChannel {
  return {
    id:              `__virtual_${type}_${pos}`,
    case_id:         caseId,
    channel_type:    type,
    party_email:     '',
    label:           null,
    position:        pos,
    nylas_thread_id: null,
    cc_emails:       [],
    last_message_at: null,
    message_count:   0,
    created_at:      '',
  }
}

export default function CaseWorkbenchPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params)
  const router = useRouter()
  const { user, role } = useUser()

  const [shipmentCase,    setCase]    = useState<ShipmentCase | null>(null)
  const [channels,        setChannels] = useState<CaseChannel[]>([])
  const [msgsByChannel,   setMsgs]    = useState<Record<string, EmailMessage[]>>({})
  const [draftsByChannel, setDrafts]  = useState<Record<string, MessageDraft[]>>({})
  const [summary,         setSummary] = useState<ThreadSummary | null>(null)
  const [loading,         setLoading] = useState(true)
  const [intelOpen,       setIntelOpen] = useState<boolean>(() => loadIntelOpen())
  const [intelFolded,     setIntelFolded] = useState<boolean>(() => loadIntelFolded())
  const [intelWidth,      setIntelWidth]  = useState<number>(() => loadIntelWidth())
  const [pendingOtherPanels, setPendingOtherPanels] = useState(0)
  const [colWidths,       setColWidths] = useState<number[]>(() => loadColWidths())

  const containerRef  = useRef<HTMLDivElement>(null)
  const colWidthsRef  = useRef<number[]>(colWidths)
  const intelWidthRef = useRef<number>(intelWidth)

  // Keep refs in sync for use inside resize closures
  useEffect(() => { colWidthsRef.current  = colWidths  }, [colWidths])
  useEffect(() => { intelWidthRef.current = intelWidth }, [intelWidth])

  function toggleIntel() {
    setIntelOpen(v => {
      const next = !v
      try { localStorage.setItem(INTEL_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }

  function toggleIntelFold() {
    setIntelFolded(v => {
      const next = !v
      try { localStorage.setItem(INTEL_FOLDED_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }

  function startIntelResize(e: React.MouseEvent) {
    e.preventDefault()
    const startX     = e.clientX
    const startWidth = intelWidthRef.current
    let   currentWidth = startWidth

    function onMove(ev: MouseEvent) {
      // Panel is on the right — dragging left widens it
      const next = Math.max(160, Math.min(600, startWidth + (startX - ev.clientX)))
      currentWidth = next
      setIntelWidth(next)
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
      try { localStorage.setItem(INTEL_WIDTH_KEY, String(currentWidth)) } catch { /* ignore */ }
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }

  async function load() {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const { data: byRef } = await supabase.from('shipment_cases').select('*').eq('ref_number', ref).maybeSingle()
    const { data: byId }  = (!byRef && UUID_RE.test(ref))
      ? await supabase.from('shipment_cases').select('*').eq('id', ref).maybeSingle()
      : { data: null }
    const caseData = byRef || byId
    if (!caseData) { setLoading(false); return }
    if (role !== 'manager' && user?.id && caseData.operator_id !== user.id) {
      router.replace('/workbench')
      return
    }
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

  // Normalise column widths when panel count changes
  useEffect(() => {
    if (!shipmentCase) return
    const otherCount = channels.filter(c => c.channel_type === 'other').length
    const n = 2 + otherCount + pendingOtherPanels
    setColWidths(prev => {
      if (prev.length === n) return prev
      const eq = 100 / n
      const next = Array<number>(n).fill(eq)
      saveColWidths(next)
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, pendingOtherPanels, shipmentCase])

  function startResize(i: number, e: React.MouseEvent) {
    e.preventDefault()
    const containerW = containerRef.current!.getBoundingClientRect().width
    const startX     = e.clientX
    const startWidths = [...colWidthsRef.current]
    let currentWidths = startWidths

    function onMove(ev: MouseEvent) {
      const delta = ((ev.clientX - startX) / containerW) * 100
      const next  = [...startWidths]
      next[i]     = Math.max(15, startWidths[i]     + delta)
      next[i + 1] = Math.max(15, startWidths[i + 1] - delta)
      currentWidths = next
      setColWidths(next)
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
      saveColWidths(currentWidths)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
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

  // Derive display channels — always show client + vendor (virtual if no DB row)
  const clientCh = channels.find(c => c.channel_type === 'client')
  const vendorCh = channels.find(c => c.channel_type === 'vendor')
  const otherChs = channels.filter(c => c.channel_type === 'other')
  const displayChannels: CaseChannel[] = [
    clientCh ?? virtualChannel(shipmentCase.id, 'client', 0),
    vendorCh ?? virtualChannel(shipmentCase.id, 'vendor', 1),
    ...otherChs,
    ...Array.from({ length: pendingOtherPanels }, (_, i) =>
      virtualChannel(shipmentCase.id, 'other', otherChs.length + i + 2)
    ),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Case context bar */}
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

      {/* Main body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: 'var(--es-n-25)' }}>

        {/* Thread panels */}
        <div ref={containerRef} style={{ display: 'flex', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {displayChannels.map((ch, i) => (
            <div key={ch.id} style={{ display: 'flex', width: `${colWidths[i] ?? (100 / displayChannels.length)}%`, flexShrink: 0, minWidth: 0, height: '100%' }}>
              <WorkbenchThreadCol
                channel={ch}
                messages={ch.id.startsWith('__virtual_') ? [] : (msgsByChannel[ch.id] || [])}
                drafts={ch.id.startsWith('__virtual_') ? [] : (draftsByChannel[ch.id] || [])}
                caseId={shipmentCase.id}
                caseRef={shipmentCase.ref_number}
                onAction={load}
                onChannelCreated={ch.id.startsWith('__virtual_') ? () => setPendingOtherPanels(p => Math.max(0, p - 1)) : undefined}
                style={{ flex: 1, minWidth: 0 }}
              />
              {i < displayChannels.length - 1 && (
                <div className="wb-resize-handle" onMouseDown={e => startResize(i, e)} />
              )}
            </div>
          ))}

          {/* Add third-party panel */}
          <div
            className="wb-add-panel-btn"
            onClick={() => setPendingOtherPanels(p => p + 1)}
            title="Add third-party thread"
          >
            <Plus size={12} />
          </div>
        </div>

        {/* Intel panel — resizable + foldable */}
        {intelOpen && (
          <>
            {/* Drag-resize handle (hidden when folded to stripe) */}
            {!intelFolded && (
              <div className="wb-intel-resize-handle" onMouseDown={startIntelResize} />
            )}

            {intelFolded ? (
              /* Stripe — click to expand */
              <div className="wb-intel-stripe" onClick={toggleIntelFold} title="Expand intel panel">
                <ChevronLeft size={11} />
              </div>
            ) : (
              /* Full panel */
              <div style={{ width: intelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--es-n-0)', overflow: 'hidden' }}>
                <div className="wb-intel-fold-bar">
                  <button className="wb-intel-fold-btn" onClick={toggleIntelFold} title="Fold intel panel">
                    <ChevronRight size={11} />
                  </button>
                </div>
                <IntelPanel shipmentCase={shipmentCase} summary={summary} />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
