'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ShipmentCase, CaseChannel, EmailMessage,
  MessageDraft, ThreadSummary, DraftTask, STATUS_STEPS,
} from '@/lib/types'
import { formatDate, formatRef } from '@/lib/utils'
import {
  ChevronLeft, RefreshCw, Sparkles, Send, X,
  Edit3, RotateCcw, Check, AlertCircle, Paperclip,
  ChevronDown, ChevronRight, StickyNote,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import MailBodyRenderer from '@/components/email/MailBodyRenderer'

// ─── Vertical Operational Timeline ───────────────────────────────────────────

function StatusFlow({ status, caseId }: { status: string; caseId: string }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [noteInput, setNoteInput] = useState('')

  function openNote(idx: number) {
    setEditingIdx(idx)
    setNoteInput(notes[idx] || '')
  }

  function saveNote(idx: number) {
    setNotes(n => ({ ...n, [idx]: noteInput }))
    setEditingIdx(null)
  }

  return (
    <div className="w-full">
      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200" />

        <div className="space-y-0">
          {STATUS_STEPS.map((step, idx) => {
            const isPast    = idx < currentIdx
            const isCurrent = idx === currentIdx
            const hasNote   = !!notes[idx]

            return (
              <div key={step.key}>
                {/* Row */}
                <div className="relative flex items-start gap-3 py-2">
                  {/* Circle */}
                  <button
                    onClick={() => openNote(idx)}
                    title="Add note"
                    className={cn(
                      'relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all mt-0.5',
                      isPast    && 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600',
                      isCurrent && 'bg-white border-blue-500 text-blue-600 ring-2 ring-blue-200 shadow-sm',
                      !isPast && !isCurrent && 'bg-white border-gray-300 text-gray-400 hover:border-gray-400',
                    )}
                  >
                    {isPast ? <Check size={10} /> : null}
                    {hasNote && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full border border-white" />
                    )}
                  </button>

                  {/* Label + note preview */}
                  <div className="flex-1 min-w-0 pb-0.5">
                    <span className={cn(
                      'text-xs leading-tight block',
                      isCurrent  && 'text-blue-700 font-semibold',
                      isPast     && 'text-gray-500',
                      !isPast && !isCurrent && 'text-gray-400',
                    )}>
                      {step.label}
                      {isCurrent && <span className="ml-1.5 text-[10px] text-blue-400 font-normal">← current</span>}
                    </span>
                    {hasNote && (
                      <span className="text-[10px] text-amber-600 leading-tight block mt-0.5 truncate">
                        {notes[idx]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline note editor */}
                {editingIdx === idx && (
                  <div className="ml-8 mb-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-800 mb-2 flex items-center gap-1.5">
                      <StickyNote size={12} />
                      Note for: <span className="font-semibold">{step.label}</span>
                    </p>
                    <textarea
                      autoFocus
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      rows={2}
                      placeholder="Add your note here…"
                      className="w-full text-xs border border-amber-200 rounded-md px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => saveNote(idx)}
                        className="text-xs bg-amber-500 text-white px-3 py-1 rounded-md hover:bg-amber-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingIdx(null)}
                        className="text-xs text-gray-500 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      {notes[idx] && (
                        <button
                          onClick={() => { setNotes(n => ({ ...n, [idx]: '' })); setEditingIdx(null) }}
                          className="text-xs text-red-500 px-2 py-1 rounded-md hover:bg-red-50 transition-colors ml-auto"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── AI Draft card ────────────────────────────────────────────────────────────

function DraftCard({
  draft, onApprove, onReject, onRegenerate,
}: {
  draft: MessageDraft
  onApprove: (edits?: { subject?: string; body_text?: string }) => void
  onReject: () => void
  onRegenerate: () => void
}) {
  const [editing, setEditing]     = useState(false)
  const [subject, setSubject]     = useState(draft.subject || '')
  const [body, setBody]           = useState(draft.body_text || '')
  const [sending, setSending]     = useState(false)

  async function handleApprove() {
    setSending(true)
    await onApprove(editing ? { subject, body_text: body } : undefined)
    setSending(false)
  }

  return (
    <div className="border border-purple-200 rounded-xl bg-purple-50/40 overflow-hidden">
      {/* Draft header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-100/60 border-b border-purple-200">
        <Sparkles size={13} className="text-purple-600 draft-pulse" />
        <span className="text-xs font-semibold text-purple-800">AI Draft — awaiting approval</span>
        <span className="ml-auto text-xs text-purple-500">{draft.channel_type} channel</span>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <div className="text-xs text-gray-500">
          <span className="font-medium">To:</span> {draft.recipient_email}
        </div>

        {/* Subject */}
        {editing ? (
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full text-xs border border-purple-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
          />
        ) : (
          <p className="text-xs font-medium text-gray-800">{draft.subject}</p>
        )}

        {/* Body */}
        {editing ? (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            className="w-full text-xs border border-purple-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400/30 resize-none"
          />
        ) : (
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {draft.body_text}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={sending}
            className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Send size={11} />
            {sending ? 'Sending…' : 'Approve & Send'}
          </button>
          <button
            onClick={() => { setEditing(e => !e) }}
            className="flex items-center gap-1.5 text-xs border border-purple-300 text-purple-700 px-3 py-1.5 rounded-md hover:bg-purple-100 transition-colors"
          >
            <Edit3 size={11} />
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={11} />
            Regenerate
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1.5 text-xs text-red-500 px-2 py-1.5 rounded-md hover:bg-red-50 transition-colors ml-auto"
          >
            <X size={11} />
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Thread panel ─────────────────────────────────────────────────────────────

function ThreadPanel({
  title, channelType, messages, drafts, caseId, onAction,
}: {
  title: string
  channelType: 'client' | 'vendor'
  messages: EmailMessage[]
  drafts: MessageDraft[]
  caseId: string
  onAction: () => void
}) {
  const borderColor = channelType === 'client' ? 'border-blue-200' : 'border-orange-200'
  const headerColor = channelType === 'client' ? 'bg-blue-50/60 border-blue-200' : 'bg-orange-50/60 border-orange-200'
  const headerText  = channelType === 'client' ? 'text-blue-800' : 'text-orange-800'

  async function approveDraft(draft: MessageDraft, edits?: { subject?: string; body_text?: string }) {
    const res = await fetch('/api/approve-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft_id:       draft.id,
        manager_id:     'coordinator',
        optional_edits: edits || null,
      }),
    })
    if (res.ok) {
      toast.success('Email sent successfully')
      onAction()
    } else {
      toast.error('Failed to send — check n8n webhook')
    }
  }

  async function rejectDraft(draft: MessageDraft) {
    await supabase
      .from('message_drafts')
      .update({ rejected_at: new Date().toISOString() })
      .eq('id', draft.id)
    await supabase
      .from('draft_tasks')
      .update({ status: 'rejected' })
      .eq('id', draft.draft_task_id || '')
    toast.success('Draft rejected')
    onAction()
  }

  async function regenerateDraft(draft: MessageDraft) {
    await supabase
      .from('draft_tasks')
      .update({ status: 'pending' })
      .eq('id', draft.draft_task_id || '')
    await supabase
      .from('message_drafts')
      .update({ rejected_at: new Date().toISOString() })
      .eq('id', draft.id)
    toast.success('Regenerating draft — check back in ~60s')
    onAction()
  }

  return (
    <div className={cn('flex flex-col border rounded-xl overflow-hidden h-full', borderColor)}>
      {/* Header */}
      <div className={cn('px-4 py-3 border-b', headerColor)}>
        <h3 className={cn('text-xs font-semibold uppercase tracking-wide', headerText)}>
          {title}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{messages.length} messages</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">

        {/* AI Drafts */}
        {drafts.map(d => (
          <DraftCard
            key={d.id}
            draft={d}
            onApprove={edits => approveDraft(d, edits)}
            onReject={() => rejectDraft(d)}
            onRegenerate={() => regenerateDraft(d)}
          />
        ))}

        {/* Messages */}
        {messages.length === 0 && drafts.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No messages yet</p>
        )}

        {[...messages].reverse().map(msg => (
          <div
            key={msg.id}
            className={cn(
              'rounded-lg px-3.5 py-3 text-xs',
              msg.direction === 'inbound'
                ? 'bg-gray-100 text-gray-800 mr-4'
                : 'bg-white border border-gray-200 text-gray-700 ml-4'
            )}
          >
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="font-medium text-gray-700 truncate">
                {msg.direction === 'inbound' ? msg.sender_email : 'You'}
              </span>
              <span className="text-gray-400 flex-shrink-0">{formatDate(msg.created_at)}</span>
            </div>
            <MailBodyRenderer body={msg.body_text} preview={msg.body_preview} />
            {msg.has_attachments && (
              <div className="flex items-center gap-1 mt-2 text-gray-500">
                <Paperclip size={11} />
                <span>Attachment</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Case Intel Panel ─────────────────────────────────────────────────────────

function CaseIntelPanel({
  shipmentCase, summary, onStatusChange,
}: {
  shipmentCase: ShipmentCase
  summary: ThreadSummary | null
  onStatusChange: () => void
}) {
  const c = shipmentCase

  const TONE_COLORS = {
    neutral:  'text-gray-600 bg-gray-100',
    positive: 'text-green-700 bg-green-100',
    tense:    'text-orange-700 bg-orange-100',
    urgent:   'text-red-700 bg-red-100',
  }

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Case Intel</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Status Flow */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-3">Status Flow</p>
          <StatusFlow status={c.status} caseId={c.id} />
        </div>

        <hr className="border-gray-100" />

        {/* AI Summary */}
        {summary && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Sparkles size={11} className="text-purple-500" />
                AI Summary
              </p>
              {summary.tone && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TONE_COLORS[summary.tone] || TONE_COLORS.neutral)}>
                  {summary.tone}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{summary.summary_text}</p>

            {summary.open_questions?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Open Questions</p>
                <ul className="space-y-1">
                  {summary.open_questions.map((q, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <AlertCircle size={10} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.communication_risks?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-red-600 mb-1.5">Risks</p>
                <ul className="space-y-1">
                  {summary.communication_risks.map((r, i) => (
                    <li key={i} className="text-xs text-red-500 flex items-start gap-1.5">
                      <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <hr className="border-gray-100" />

        {/* Confirmed Facts */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2.5">Confirmed Facts</p>
          <div className="space-y-1.5">
            {[
              { label: 'Origin',       value: c.origin       },
              { label: 'Destination',  value: c.destination  },
              { label: 'Weight',       value: c.weight_kg ? `${c.weight_kg} kg` : null },
              { label: 'Dimensions',   value: c.dimensions   },
              { label: 'Rate',         value: c.rate_amount  ? `${c.rate_amount} ${c.rate_currency}` : null },
              { label: 'Transit',      value: c.transit_days ? `${c.transit_days} days` : null },
              { label: 'Flight date',  value: c.flight_date  },
              { label: 'Item',         value: c.item_desc    },
            ].filter(f => f.value).map(f => (
              <div key={f.label} className="flex justify-between text-xs">
                <span className="text-gray-400">{f.label}</span>
                <span className="text-gray-700 font-medium text-right max-w-[60%] break-words">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Case Workbench page ──────────────────────────────────────────────────────

export default function CaseWorkbenchPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params)

  const [shipmentCase, setCase]     = useState<ShipmentCase | null>(null)
  const [channels, setChannels]     = useState<CaseChannel[]>([])
  const [clientMsgs, setClientMsgs] = useState<EmailMessage[]>([])
  const [vendorMsgs, setVendorMsgs] = useState<EmailMessage[]>([])
  const [clientDrafts, setCDrafts]  = useState<MessageDraft[]>([])
  const [vendorDrafts, setVDrafts]  = useState<MessageDraft[]>([])
  const [summary, setSummary]       = useState<ThreadSummary | null>(null)
  const [loading, setLoading]       = useState(true)

  async function load() {
    // Load case by ref_number OR id
    const { data: caseData } = await supabase
      .from('shipment_cases')
      .select('*')
      .or(`ref_number.eq.${ref},id.eq.${ref}`)
      .maybeSingle()

    if (!caseData) { setLoading(false); return }
    setCase(caseData)

    const caseId = caseData.id

    const [
      { data: channelsData },
      { data: msgsData },
      { data: draftsData },
      { data: summaryData },
    ] = await Promise.all([
      supabase.from('case_channels').select('*').eq('case_id', caseId),
      supabase.from('email_messages').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
      supabase
        .from('message_drafts')
        .select('*')
        .eq('case_id', caseId)
        .is('sent_at', null)
        .is('rejected_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('thread_summaries')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle(),
    ])

    const allMsgs   = msgsData   || []
    const allDrafts = draftsData || []

    const clientChannel = (channelsData || []).find(c => c.channel_type === 'client')
    const vendorChannel = (channelsData || []).find(c => c.channel_type === 'vendor')

    setChannels(channelsData || [])
    setClientMsgs(allMsgs.filter(m => m.channel_id === clientChannel?.id))
    setVendorMsgs(allMsgs.filter(m => m.channel_id === vendorChannel?.id))
    setCDrafts(allDrafts.filter(d => d.channel_type === 'client'))
    setVDrafts(allDrafts.filter(d => d.channel_type === 'vendor'))
    setSummary(summaryData || null)

    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase.channel('workbench')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_drafts' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [ref])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!shipmentCase) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p className="text-sm">Case not found: {ref}</p>
        <Link href="/cases" className="text-xs text-blue-600 mt-2 hover:underline">← Back to cases</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <Link href="/cases" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-gray-900">{formatRef(shipmentCase.ref_number)}</h1>
          {shipmentCase.origin && shipmentCase.destination && (
            <span className="text-xs text-gray-500">{shipmentCase.origin} → {shipmentCase.destination}</span>
          )}
          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
            {shipmentCase.status.replace(/_/g, ' ')}
          </span>
          {shipmentCase.priority === 'urgent' && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">Urgent</span>
          )}
        </div>
        <button onClick={load} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* 4-column layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-4 gap-3 p-3">

        {/* Col 1: Case list (mini) */}
        <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Active Cases</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <CaseMiniList currentRef={shipmentCase.ref_number} />
          </div>
        </div>

        {/* Col 2: Client thread */}
        <ThreadPanel
          title="Client Thread"
          channelType="client"
          messages={clientMsgs}
          drafts={clientDrafts}
          caseId={shipmentCase.id}
          onAction={load}
        />

        {/* Col 3: Vendor thread */}
        <ThreadPanel
          title="Vendor Thread"
          channelType="vendor"
          messages={vendorMsgs}
          drafts={vendorDrafts}
          caseId={shipmentCase.id}
          onAction={load}
        />

        {/* Col 4: Case Intel */}
        <CaseIntelPanel
          shipmentCase={shipmentCase}
          summary={summary}
          onStatusChange={load}
        />
      </div>
    </div>
  )
}

// ─── Mini case list (column 1) ────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  new:               'bg-blue-100 text-blue-700',
  vendor_requested:  'bg-yellow-100 text-yellow-700',
  quote_received:    'bg-amber-100 text-amber-700',
  quote_sent:        'bg-orange-100 text-orange-700',
  client_confirmed:  'bg-teal-100 text-teal-700',
  vendor_confirmed:  'bg-cyan-100 text-cyan-700',
  label_received:    'bg-indigo-100 text-indigo-700',
  booked:            'bg-purple-100 text-purple-700',
  in_transit:        'bg-blue-100 text-blue-800',
  delivered:         'bg-green-100 text-green-700',
  closed:            'bg-gray-100 text-gray-500',
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  normal: 'bg-gray-300',
  low:    'bg-gray-200',
}

function CaseMiniList({ currentRef }: { currentRef: string | null }) {
  const [cases,   setCases]   = useState<ShipmentCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  async function fetchCases() {
    setLoading(true)
    setError(false)
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
      <div className="divide-y divide-gray-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2.5 animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-2.5 w-24 bg-gray-200 rounded" />
              <div className="h-2 w-16 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
        <p className="text-xs text-gray-400 mb-2">Failed to load cases</p>
        <button
          onClick={fetchCases}
          className="text-xs text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-3 text-center text-gray-400">
        <p className="text-xs">No active cases</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {cases.map(c => {
        const isCurrent = c.ref_number === currentRef
        return (
          <Link
            key={c.id}
            href={`/cases/${c.ref_number || c.id}`}
            className={cn(
              'flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors',
              isCurrent && 'bg-blue-50 border-l-[3px] border-l-blue-500'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', PRIORITY_DOT[c.priority] || 'bg-gray-300')} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-800 truncate">{formatRef(c.ref_number)}</p>
              {c.client_name && (
                <p className="text-[10px] text-gray-400 truncate">{c.client_name}</p>
              )}
              <div className="flex items-center justify-between mt-1 gap-1">
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium leading-none', STATUS_PILL[c.status] || 'bg-gray-100 text-gray-500')}>
                  {c.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] text-gray-300">{formatDate(c.updated_at)}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
