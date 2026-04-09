'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import {
  ShipmentCase, CaseChannel, EmailMessage,
  MessageDraft, ThreadSummary, STATUS_STEPS,
} from '@/lib/types'
import { formatDate, formatRef } from '@/lib/utils'
import {
  ChevronLeft, ChevronDown, ChevronUp, RefreshCw, Sparkles, Send, X,
  Edit3, RotateCcw, Check, AlertCircle, Paperclip, StickyNote,
} from 'lucide-react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import MailBodyRenderer from '@/components/email/MailBodyRenderer'
import { InlineCompose } from '@/components/cases/InlineCompose'

// ─── Numbered Status Timeline ─────────────────────────────────────────────────

function StatusTimeline({ status, caseId }: { status: string; caseId: string }) {
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status)
  const [notes,      setNotes]      = useState<Record<number, string>>({})
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [noteInput,  setNoteInput]  = useState('')

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
        {STATUS_STEPS.map((step, idx) => {
          const isPast    = idx < currentIdx
          const isCurrent = idx === currentIdx
          const hasNote   = !!notes[idx]

          return (
            <div key={step.key}>
              <div className="relative flex items-start gap-3 py-1.5">
                {/* Spine connector */}
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={cn(
                    'absolute left-[14px] top-8 w-0.5 h-6 -bottom-1',
                    isPast ? 'bg-violet-300' : 'bg-gray-200'
                  )} />
                )}

                {/* Numbered circle */}
                <button
                  onClick={() => openNote(idx)}
                  title="Add note"
                  className={cn(
                    'relative z-10 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all text-[11px] font-bold font-display mt-0.5',
                    isPast    && 'bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200',
                    isCurrent && 'bg-white border-violet-500 text-violet-700 ring-3 ring-violet-100 shadow-sm',
                    !isPast && !isCurrent && 'bg-white/60 border-gray-200 text-gray-300',
                  )}
                >
                  {isPast ? <Check size={12} strokeWidth={2.5} /> : idx + 1}
                  {hasNote && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full border border-white" />
                  )}
                </button>

                {/* Label */}
                <div className="flex-1 min-w-0 pt-1">
                  <span className={cn(
                    'text-xs leading-tight block font-medium',
                    isCurrent  && 'text-violet-700 font-semibold',
                    isPast     && 'text-gray-500',
                    !isPast && !isCurrent && 'text-gray-300',
                  )}>
                    {step.label}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] text-violet-400 font-normal bg-violet-50 px-1.5 py-0.5 rounded-full">
                        current
                      </span>
                    )}
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
                <div className="ml-10 mb-2 bg-slate-50/80 border border-slate-200 rounded-xl p-3 animate-shimmer-in">
                  <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <StickyNote size={12} />
                    Note — <span>{step.label}</span>
                  </p>
                  <textarea
                    autoFocus
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    rows={2}
                    placeholder="Add your note…"
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300/40 bg-white/80 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveNote(idx)}
                      className="text-xs bg-violet-600 text-white px-3 py-1 rounded-lg hover:bg-violet-700 transition-colors font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingIdx(null)}
                      className="text-xs text-gray-500 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    {notes[idx] && (
                      <button
                        onClick={() => { setNotes(n => ({ ...n, [idx]: '' })); setEditingIdx(null) }}
                        className="text-xs text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors ml-auto"
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
  const [editing,  setEditing]  = useState(false)
  const [subject,  setSubject]  = useState(draft.subject || '')
  const [body,     setBody]     = useState(draft.body_text || '')
  const [sending,  setSending]  = useState(false)

  async function handleApprove() {
    setSending(true)
    await onApprove(editing ? { subject, body_text: body } : undefined)
    setSending(false)
  }

  return (
    <div className="border border-violet-200 rounded-xl bg-violet-50/50 overflow-hidden animate-shimmer-in flex-shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-100/60 border-b border-violet-200">
        <Sparkles size={12} className="text-violet-600 draft-pulse" />
        <span className="text-xs font-semibold text-violet-800 font-display">AI Draft — awaiting approval</span>
        <span className="ml-auto text-xs text-violet-400 capitalize">{draft.channel_type}</span>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-400">To:</span> {draft.recipient_email}
        </div>

        {editing ? (
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full text-xs border border-violet-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300/40 bg-white/80"
          />
        ) : (
          <p className="text-xs font-semibold text-gray-800">{draft.subject}</p>
        )}

        {editing ? (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            className="w-full text-xs border border-violet-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300/40 resize-none bg-white/80"
          />
        ) : (
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {draft.body_text}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={sending}
            className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-semibold"
          >
            <Send size={11} />
            {sending ? 'Sending…' : 'Approve & Send'}
          </button>
          <button
            onClick={() => setEditing(e => !e)}
            className="flex items-center gap-1.5 text-xs border border-violet-200 text-violet-700 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
          >
            <Edit3 size={11} />
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={11} />
            Regenerate
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1.5 text-xs text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto"
          >
            <X size={11} />
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Outlook-style email message card (collapsible) ───────────────────────────

function personaChip(direction: string, channelType: 'client' | 'vendor') {
  if (direction === 'outbound') return { label: 'You', cls: 'bg-violet-50 text-violet-600' }
  if (channelType === 'client')  return { label: 'Client', cls: 'bg-blue-50 text-blue-600' }
  return { label: 'Vendor', cls: 'bg-slate-100 text-slate-600' }
}

function formatMsgDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function EmailCard({
  msg, channelType, defaultCollapsed = false, caseCode,
}: {
  msg: EmailMessage
  channelType: 'client' | 'vendor'
  defaultCollapsed?: boolean
  caseCode?: string | null
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isInbound = msg.direction === 'inbound'
  const accentCls = isInbound
    ? (channelType === 'client' ? 'border-l-blue-400' : 'border-l-slate-400')
    : 'border-l-violet-400'
  const chip = personaChip(msg.direction, channelType)
  const senderLabel = isInbound ? (msg.sender_email || '—') : 'You'

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          'w-full flex items-center gap-3 px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm transition-all text-left group border-l-[3px]',
          accentCls,
        )}
      >
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0', chip.cls)}>
          {chip.label}
        </span>
        <span className="text-xs font-medium text-gray-700 flex-shrink-0">{senderLabel}</span>
        <span className="text-xs text-gray-400 truncate flex-1 min-w-0">
          {msg.subject || msg.body_preview || '(no subject)'}
        </span>
        <span className="text-[11px] text-gray-400 flex-shrink-0">
          {new Date(msg.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        <ChevronDown size={13} className="text-gray-300 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
      </button>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden border-l-[3px] transition-shadow hover:shadow-md',
      accentCls,
    )}>
      {/* Email header */}
      <div className="px-4 pt-3 pb-2.5 bg-gray-50 border-b border-gray-100">
        {/* Subject */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 leading-snug">
              {msg.subject || '(no subject)'}
            </p>
            {caseCode && (
              <span className="text-[9px] font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 select-all w-fit">
                {caseCode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', chip.cls)}>
              {chip.label}
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-300 hover:text-gray-500 transition-colors"
              title="Collapse"
            >
              <ChevronUp size={13} />
            </button>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-0.5">
          <span className="text-[11px] text-gray-400 font-medium self-start pt-px">From</span>
          <span className="text-xs text-gray-700 font-medium truncate">
            {isInbound ? (msg.sender_email || '—') : `freightmate58@gmail.com`}
          </span>

          <span className="text-[11px] text-gray-400 font-medium self-start pt-px">To</span>
          <span className="text-xs text-gray-500 truncate">
            {msg.recipient_email || '—'}
          </span>

          {msg.cc && msg.cc.length > 0 && (
            <>
              <span className="text-[11px] text-gray-400 font-medium self-start pt-px">CC</span>
              <span className="text-xs text-gray-500 truncate">{msg.cc.join(', ')}</span>
            </>
          )}

          <span className="text-[11px] text-gray-400 font-medium self-start pt-px">Date</span>
          <span className="text-[11px] text-gray-400">{formatMsgDate(msg.created_at)}</span>
        </div>
      </div>

      {/* Email body */}
      <div className="px-4 py-3 bg-white">
        <MailBodyRenderer body={msg.body_text} preview={msg.body_preview} />
        {msg.has_attachments && (
          <div className="flex items-center gap-1 mt-2.5 text-xs text-gray-400">
            <Paperclip size={11} />
            <span>Attachment</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Thread panel ─────────────────────────────────────────────────────────────

function ThreadPanel({
  title, channelType, messages, drafts, caseId, channelId, caseCode, partyEmail, onAction,
}: {
  title: string
  channelType: 'client' | 'vendor'
  messages: EmailMessage[]
  drafts: MessageDraft[]
  caseId: string
  channelId: string | null
  caseCode: string | null
  partyEmail: string
  onAction: () => void
}) {
  const panelCls   = channelType === 'client' ? 'glass-panel-client' : 'glass-panel-vendor'
  const headerText = channelType === 'client' ? 'text-blue-700'   : 'text-slate-600'
  const headerBg   = channelType === 'client' ? 'bg-blue-50/60'   : 'bg-slate-50/60'
  const countCls   = channelType === 'client' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'

  const lastMsg     = [...messages].at(-1)
  const defaultSubject = lastMsg?.subject
    ? (lastMsg.subject.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject}`)
    : ''

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
    if (res.ok) { toast.success('Email sent'); onAction() }
    else        { toast.error('Failed to send — check n8n webhook') }
  }

  async function rejectDraft(draft: MessageDraft) {
    await supabase.from('message_drafts').update({ rejected_at: new Date().toISOString() }).eq('id', draft.id)
    await supabase.from('draft_tasks').update({ status: 'rejected' }).eq('id', draft.draft_task_id || '')
    toast.success('Draft rejected')
    onAction()
  }

  async function regenerateDraft(draft: MessageDraft) {
    await supabase.from('draft_tasks').update({ status: 'pending' }).eq('id', draft.draft_task_id || '')
    await supabase.from('message_drafts').update({ rejected_at: new Date().toISOString() }).eq('id', draft.id)
    toast.success('Regenerating — check back in ~60s')
    onAction()
  }

  return (
    <div className={cn('flex flex-col rounded-xl overflow-hidden h-full', panelCls)}>
      {/* Panel header */}
      <div className={cn('px-4 py-3 border-b border-white/60 flex-shrink-0', headerBg)}>
        <div className="flex items-center justify-between">
          <h3 className={cn('text-xs font-bold uppercase tracking-widest font-display', headerText)}>
            {title}
          </h3>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', countCls)}>
            {messages.length} messages
          </span>
        </div>
      </div>

      {/* Scrollable email thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && drafts.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-10">No messages yet</p>
        )}
        {messages.map((msg, idx) => (
          <EmailCard
            key={msg.id}
            msg={msg}
            channelType={channelType}
            defaultCollapsed={idx < messages.length - 1}
            caseCode={caseCode}
          />
        ))}
      </div>

      {/* AI Draft cards — above compose, shown when drafts exist */}
      {drafts.length > 0 && (
        <div className="px-3 py-2 space-y-2 border-t border-white/60 bg-white/30 backdrop-blur-sm flex-shrink-0 max-h-64 overflow-y-auto">
          {drafts.map(d => (
            <DraftCard
              key={d.id}
              draft={d}
              onApprove={edits => approveDraft(d, edits)}
              onReject={() => rejectDraft(d)}
              onRegenerate={() => regenerateDraft(d)}
            />
          ))}
        </div>
      )}

      {/* Inline compose — always at bottom */}
      <InlineCompose
        channelType={channelType}
        caseId={caseId}
        channelId={channelId}
        defaultTo={partyEmail}
        defaultSubject={defaultSubject}
        replyToNylasMessageId={lastMsg?.nylas_message_id ?? null}
        onSent={onAction}
      />
    </div>
  )
}

// ─── Case Intel Panel ─────────────────────────────────────────────────────────

function CaseIntelPanel({
  shipmentCase, summary,
}: {
  shipmentCase: ShipmentCase
  summary: ThreadSummary | null
}) {
  const c = shipmentCase
  const [summaryLoading, setSummaryLoading] = useState(false)

  async function handleUpdateSummary() {
    setSummaryLoading(true)
    try {
      // Fire for both channels so both summaries stay current
      await Promise.all(['client', 'vendor'].map(channelType =>
        fetch('/api/request-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ case_id: c.id, channel_type: channelType }),
        })
      ))
      toast.success('Generating summary…')
    } catch {
      toast.error('Summary update failed')
    } finally {
      setSummaryLoading(false)
    }
  }

  const TONE_COLORS = {
    neutral:  'text-slate-600 bg-slate-100',
    positive: 'text-teal-700 bg-teal-50',
    tense:    'text-slate-700 bg-slate-200',
    urgent:   'text-rose-700 bg-rose-50',
  }

  const facts = [
    { label: 'Origin',      value: c.origin },
    { label: 'Destination', value: c.destination },
    { label: 'Weight',      value: c.weight_kg    ? `${c.weight_kg} kg`              : null },
    { label: 'Dimensions',  value: c.dimensions },
    { label: 'Rate',        value: c.rate_amount  ? `${c.rate_amount} ${c.rate_currency}` : null },
    { label: 'Transit',     value: c.transit_days ? `${c.transit_days} days`         : null },
    { label: 'Flight date', value: c.flight_date },
    { label: 'Item',        value: c.item_desc },
  ].filter(f => f.value)

  return (
    <div className="flex flex-col h-full glass-panel-intel rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/60 bg-violet-50/50 flex-shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-violet-700 font-display">
          Job Status
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">

        {/* Numbered status timeline */}
        <StatusTimeline status={c.status} caseId={c.id} />

        {/* AI Summary */}
        <hr className="border-white/60" />
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 font-display uppercase tracking-wide">
              <Sparkles size={11} className="text-violet-500" />
              Rolling Summary
            </p>
            <button
              onClick={handleUpdateSummary}
              disabled={summaryLoading}
              className="text-[10px] text-violet-600 hover:text-violet-800 disabled:opacity-40 flex items-center gap-1 font-medium"
            >
              <RefreshCw size={10} className={summaryLoading ? 'animate-spin' : ''} />
              {summaryLoading ? 'Updating…' : 'Update'}
            </button>
          </div>
          {summary ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                {summary.tone && (
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', TONE_COLORS[summary.tone] || TONE_COLORS.neutral)}>
                    {summary.tone}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">
                  Updated {formatDate(summary.updated_at)}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{summary.summary_text}</p>

              {summary.open_questions?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-amber-700 mb-1.5 uppercase tracking-wide">Open Questions</p>
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
                  <p className="text-[10px] font-bold text-red-600 mb-1.5 uppercase tracking-wide">Risks</p>
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
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No summary yet — click Update to generate.</p>
          )}
        </div>

        {/* Confirmed facts */}
        {facts.length > 0 && (
          <>
            <hr className="border-white/60" />
            <div>
              <p className="text-[10px] font-bold text-gray-500 mb-2.5 uppercase tracking-wide font-display">
                Confirmed Facts
              </p>
              <div className="space-y-1.5">
                {facts.map(f => (
                  <div key={f.label} className="flex justify-between text-xs">
                    <span className="text-gray-400">{f.label}</span>
                    <span className="text-gray-700 font-medium text-right max-w-[60%] break-words">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
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
      supabase.from('case_channels').select('*').eq('case_id', caseId),
      supabase.from('email_messages').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
      supabase.from('message_drafts').select('*')
        .eq('case_id', caseId)
        .is('sent_at', null)
        .is('rejected_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('thread_summaries').select('*').eq('case_id', caseId).maybeSingle(),
    ])

    const allMsgs   = msgsData   || []
    const allDrafts = draftsData || []

    const clientChannel = (channelsData || []).find(c => c.channel_type === 'client')
    const vendorChannel = (channelsData || []).find(c => c.channel_type === 'vendor')

    setChannels(channelsData || [])

    // Primary: filter by channel_id (set by triage or WF1/WF2)
    // Fallback: if channel_id is null, match by party_email (handles emails
    // that arrived via nylas-sync and were linked to the case but missed
    // channel_id assignment, e.g. due to a silent upsert failure)
    setClientMsgs(allMsgs.filter(m => {
      if (m.channel_id === clientChannel?.id) return true
      if (m.channel_id === null && clientChannel) {
        return m.sender_email    === clientChannel.party_email ||
               m.recipient_email === clientChannel.party_email
      }
      return false
    }))
    setVendorMsgs(allMsgs.filter(m => {
      if (m.channel_id === vendorChannel?.id) return true
      if (m.channel_id === null && vendorChannel) {
        return m.sender_email    === vendorChannel.party_email ||
               m.recipient_email === vendorChannel.party_email
      }
      return false
    }))
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
      <div className="flex items-center justify-center h-full workbench-bg">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!shipmentCase) {
    return (
      <div className="flex flex-col items-center justify-center h-full workbench-bg text-gray-400">
        <p className="text-sm">Case not found: {ref}</p>
        <Link href="/cases" className="text-xs text-violet-600 mt-2 hover:underline">← Back to cases</Link>
      </div>
    )
  }

  const clientChannel = channels.find(c => c.channel_type === 'client')
  const vendorChannel = channels.find(c => c.channel_type === 'vendor')

  return (
    <div className="flex flex-col h-full workbench-bg">
      {/* Top bar — glass */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/80 px-5 py-3 flex items-center gap-4 flex-shrink-0 shadow-sm shadow-violet-900/5">
        <Link href="/cases" className="text-gray-400 hover:text-violet-600 transition-colors">
          <ChevronLeft size={18} />
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 font-display tracking-tight font-mono">
            {formatRef(shipmentCase.ref_number)}
          </h1>
          {shipmentCase.case_code && (
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
              {shipmentCase.case_code}
            </span>
          )}
          {shipmentCase.origin && shipmentCase.destination && (
            <span className="text-xs text-gray-500 hidden sm:block">
              {shipmentCase.origin} → {shipmentCase.destination}
            </span>
          )}
          <span className="text-xs px-2.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">
            {shipmentCase.status.replace(/_/g, ' ')}
          </span>
          {shipmentCase.priority === 'urgent' && (
            <span className="text-xs px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold animate-pulse">
              Urgent
            </span>
          )}
          {shipmentCase.client_name && (
            <span className="text-xs text-gray-400 hidden md:block truncate max-w-32">
              {shipmentCase.client_name}
            </span>
          )}
        </div>

        <button onClick={load} className="ml-auto text-gray-400 hover:text-violet-600 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* 4-column workbench — resizable */}
      <PanelGroup direction="horizontal" autoSaveId="workbench-panels" className="flex-1 overflow-hidden p-3 gap-0">

        {/* Col 1: Active cases list */}
        <Panel defaultSize={18} minSize={12}>
          <div className="h-full flex flex-col glass-panel rounded-xl overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/60 bg-white/30 flex-shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-display">
                Active Cases
              </p>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <CaseMiniList currentRef={shipmentCase.ref_number} />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2.5 flex items-center justify-center group cursor-col-resize">
          <div className="w-0.5 h-10 rounded-full bg-white/50 group-hover:bg-violet-400 group-active:bg-violet-500 transition-colors" />
        </PanelResizeHandle>

        {/* Col 2: Client thread */}
        <Panel defaultSize={28} minSize={16}>
          <ThreadPanel
            title="Client Thread"
            channelType="client"
            messages={clientMsgs}
            drafts={clientDrafts}
            caseId={shipmentCase.id}
            channelId={clientChannel?.id ?? null}
            caseCode={shipmentCase.case_code ?? null}
            partyEmail={clientChannel?.party_email ?? shipmentCase.client_email ?? ''}
            onAction={load}
          />
        </Panel>

        <PanelResizeHandle className="w-2.5 flex items-center justify-center group cursor-col-resize">
          <div className="w-0.5 h-10 rounded-full bg-white/50 group-hover:bg-violet-400 group-active:bg-violet-500 transition-colors" />
        </PanelResizeHandle>

        {/* Col 3: Vendor thread */}
        <Panel defaultSize={28} minSize={16}>
          <ThreadPanel
            title="Vendor Thread"
            channelType="vendor"
            messages={vendorMsgs}
            drafts={vendorDrafts}
            caseId={shipmentCase.id}
            channelId={vendorChannel?.id ?? null}
            caseCode={shipmentCase.case_code ?? null}
            partyEmail={vendorChannel?.party_email ?? ''}
            onAction={load}
          />
        </Panel>

        <PanelResizeHandle className="w-2.5 flex items-center justify-center group cursor-col-resize">
          <div className="w-0.5 h-10 rounded-full bg-white/50 group-hover:bg-violet-400 group-active:bg-violet-500 transition-colors" />
        </PanelResizeHandle>

        {/* Col 4: Job Status + Intel */}
        <Panel defaultSize={26} minSize={16}>
          <CaseIntelPanel
            shipmentCase={shipmentCase}
            summary={summary}
          />
        </Panel>

      </PanelGroup>
    </div>
  )
}

// ─── Mini case list (column 1) ────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  new:               'bg-slate-100 text-slate-600',
  vendor_requested:  'bg-blue-50 text-blue-700',
  quote_received:    'bg-slate-100 text-slate-700',
  quote_sent:        'bg-indigo-100 text-indigo-700',
  client_confirmed:  'bg-teal-50 text-teal-700',
  vendor_confirmed:  'bg-slate-100 text-slate-700',
  label_received:    'bg-violet-100 text-violet-700',
  booked:            'bg-indigo-100 text-indigo-700',
  in_transit:        'bg-blue-100 text-blue-700',
  delivered:         'bg-slate-200 text-slate-700',
  closed:            'bg-gray-100 text-gray-500',
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-rose-500 shadow-sm shadow-rose-300',
  high:   'bg-amber-500',
  normal: 'bg-slate-400',
  low:    'bg-slate-200',
}

function CaseMiniList({ currentRef }: { currentRef: string | null }) {
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
      <div className="divide-y divide-white/30">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2.5 animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-1.5 flex-shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-2.5 w-24 bg-gray-100 rounded" />
              <div className="h-2 w-16 bg-gray-50 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
        <p className="text-xs text-gray-400 mb-2">Failed to load</p>
        <button onClick={fetchCases} className="text-xs text-violet-600 hover:underline">Retry</button>
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
    <div className="divide-y divide-white/30">
      {cases.map(c => {
        const isCurrent = c.ref_number === currentRef
        return (
          <Link
            key={c.id}
            href={`/cases/${c.ref_number || c.id}`}
            className={cn(
              'flex items-start gap-2 px-3 py-2.5 hover:bg-white/40 transition-colors',
              isCurrent && 'bg-violet-50/70 border-l-[3px] border-l-violet-500'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', PRIORITY_DOT[c.priority] || 'bg-gray-300')} />
            <div className="min-w-0 flex-1">
              <p className={cn('text-xs font-bold truncate font-mono', isCurrent ? 'text-violet-800' : 'text-gray-800')}>
                {formatRef(c.ref_number)}
              </p>
              {c.client_name && (
                <p className="text-[10px] text-gray-400 truncate">{c.client_name}</p>
              )}
              <div className="flex items-center justify-between mt-1 gap-1">
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold leading-none', STATUS_PILL[c.status] || 'bg-gray-100 text-gray-500')}>
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
