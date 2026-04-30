'use client'

import { useState } from 'react'
import { Send, Edit3, RotateCcw, X, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CaseChannel, EmailMessage, MessageDraft } from '@/lib/types'
import { toast } from 'sonner'
import ThreadView from '@/components/email/ThreadView'
import { ThreadActionsBar } from '@/components/workbench/ThreadActionsBar'
import { InlineCompose } from '@/components/cases/InlineCompose'

// ── DraftCard (inline, workbench-specific) ────────────────────────────────────

function DraftCard({
  draft, onApprove, onReject, onRegenerate,
}: {
  draft: MessageDraft
  onApprove: (edits?: { subject?: string; body_text?: string }) => void
  onReject: () => void
  onRegenerate: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(draft.subject || '')
  const [body,    setBody]    = useState(draft.body_text || '')
  const [sending, setSending] = useState(false)

  async function handleApprove() {
    setSending(true)
    await onApprove(editing ? { subject, body_text: body } : undefined)
    setSending(false)
  }

  return (
    <div className="wb-draft-card">
      <div className="wb-draft-header">
        <Sparkles size={12} style={{ color: 'var(--es-brand)' }} />
        <span className="wb-draft-title">AI Draft — awaiting approval</span>
        <span className="wb-draft-channel">{draft.channel_type}</span>
      </div>
      <div className="wb-draft-body">
        <div className="wb-draft-to"><span>To:</span> {draft.recipient_email}</div>
        {editing
          ? <input value={subject} onChange={e => setSubject(e.target.value)} className="wb-draft-input" />
          : <p className="wb-draft-subject">{draft.subject}</p>}
        {editing
          ? <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} className="wb-draft-textarea" />
          : <p className="wb-draft-text">{draft.body_text}</p>}
        <div className="wb-draft-actions">
          <button onClick={handleApprove} disabled={sending} className="wb-draft-btn-approve">
            <Send size={11} /> {sending ? 'Sending…' : 'Approve & Send'}
          </button>
          <button onClick={() => setEditing(e => !e)} className="wb-draft-btn-edit">
            <Edit3 size={11} /> {editing ? 'Preview' : 'Edit'}
          </button>
          <button onClick={onRegenerate} className="wb-draft-btn-regen">
            <RotateCcw size={11} /> Regenerate
          </button>
          <button onClick={onReject} className="wb-draft-btn-reject">
            <X size={11} /> Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ── WorkbenchThreadCol ────────────────────────────────────────────────────────

interface Props {
  channel: CaseChannel
  messages: EmailMessage[]
  drafts: MessageDraft[]
  caseId: string
  caseRef: string | null
  onAction: () => void
  onChannelCreated?: () => void
  style?: React.CSSProperties
}

export function WorkbenchThreadCol({ channel, messages, drafts, caseId, caseRef, onAction, onChannelCreated, style }: Props) {
  const virtual      = channel.id.startsWith('__virtual_')
  const lastMsg      = messages.at(-1)
  const defaultSubj  = lastMsg?.subject
    ? (lastMsg.subject.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject}`)
    : (caseRef ? `Re: Case ${caseRef}` : '')

  const typeLabel =
    channel.channel_type === 'client' ? 'Client'
    : channel.channel_type === 'vendor' ? 'Vendor'
    : (channel.label || channel.party_email)

  async function approveDraft(draft: MessageDraft, edits?: { subject?: string; body_text?: string }) {
    const res = await fetch('/api/approve-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_id: draft.id, manager_id: 'coordinator', optional_edits: edits || null }),
    })
    if (res.ok) { toast.success('Email sent'); onAction() }
    else        { toast.error('Failed to send') }
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
    <div className="wb-thread-col" style={style}>
      {/* Column header */}
      <div className={`wb-col-header ${channel.channel_type}`}>
        <span className="wb-col-header-title">{typeLabel}</span>
        <span className="wb-col-count">{messages.length}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--es-n-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {channel.party_email}
        </span>
      </div>

      {/* Unfoldable actions bar */}
      <ThreadActionsBar lastMsg={lastMsg} />

      {/* Thread messages — same component as inbox */}
      <ThreadView
        messages={messages}
      />

      {/* AI Draft cards */}
      {drafts.length > 0 && (
        <div className="wb-drafts-container">
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

      {/* Always-open compose area */}
      <InlineCompose
        channelType={channel.channel_type}
        caseId={caseId}
        channelId={virtual ? null : channel.id}
        defaultTo={channel.party_email}
        defaultSubject={defaultSubj}
        replyToNylasMessageId={lastMsg?.nylas_message_id ?? null}
        onSent={onAction}
        onChannelCreated={virtual ? onChannelCreated : undefined}
      />
    </div>
  )
}
