'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageDraft, ShipmentCase } from '@/lib/types'
import { formatDate, formatRef } from '@/lib/utils'
import {
  FileText, Check, X, RefreshCw, ChevronRight, Send,
  User, Building2, Cpu, Clock, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Draft status badge ───────────────────────────────────────────────────────

function DraftStatusBadge({ draft }: { draft: MessageDraft }) {
  if (draft.sent_at)       return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Sent</span>
  if (draft.rejected_at)   return <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">Rejected</span>
  if (draft.approved_at)   return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Approved</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium animate-pulse">Awaiting approval</span>
}

// ─── Channel badge ────────────────────────────────────────────────────────────

function ChannelBadge({ type }: { type: 'client' | 'vendor' | null }) {
  if (type === 'client') return (
    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
      <User size={10} /> Client
    </span>
  )
  if (type === 'vendor') return (
    <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
      <Building2 size={10} /> Vendor
    </span>
  )
  return null
}

// ─── Draft detail panel ───────────────────────────────────────────────────────

function DraftDetailPanel({
  draft,
  caseInfo,
  onAction,
}: {
  draft: MessageDraft
  caseInfo: ShipmentCase | null
  onAction: () => void
}) {
  const [editing, setEditing]       = useState(false)
  const [subject, setSubject]       = useState(draft.subject || '')
  const [body, setBody]             = useState(draft.body_text || '')
  const [sending, setSending]       = useState(false)
  const [rejecting, setRejecting]   = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const isPending = !draft.approved_at && !draft.rejected_at && !draft.sent_at

  async function handleApprove() {
    if (!process.env.NEXT_PUBLIC_N8N_SEND_URL) {
      toast.error('N8N_SEND_URL not configured')
      return
    }
    setSending(true)
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_N8N_SEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AxisLog-Key': process.env.NEXT_PUBLIC_N8N_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify({
          draft_id: draft.id,
          optional_edits: editing ? { subject, body_text: body } : undefined,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Draft approved and queued for sending')
      onAction()
    } catch (e) {
      toast.error('Failed to send: ' + (e as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function handleReject() {
    const { error } = await supabase
      .from('message_drafts')
      .update({ rejected_at: new Date().toISOString(), manager_notes: rejectNote || null })
      .eq('id', draft.id)
    if (error) { toast.error(error.message); return }
    toast.success('Draft rejected')
    setRejecting(false)
    onAction()
  }

  async function handleRegenerate() {
    const taskId = draft.draft_task_id
    if (!taskId) { toast.error('No draft task linked'); return }
    const { error } = await supabase
      .from('draft_tasks')
      .update({ status: 'pending' })
      .eq('id', taskId)
    if (error) { toast.error(error.message); return }
    toast.success('Re-queued for generation — check back in ~60s')
    onAction()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ChannelBadge type={draft.channel_type} />
              <DraftStatusBadge draft={draft} />
              {draft.model_used && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Cpu size={10} /> {draft.model_used.split('-').slice(1, 3).join('-')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              To: <span className="font-medium text-gray-600">{draft.recipient_email || '—'}</span>
              {caseInfo && (
                <> · <Link href={`/cases/${caseInfo.ref_number || caseInfo.id}`} className="text-blue-500 hover:underline">
                  {formatRef(caseInfo.ref_number)}
                </Link></>
              )}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">{formatDate(draft.created_at)}</p>
            {draft.latency_ms && (
              <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                <Clock size={9} /> {(draft.latency_ms / 1000).toFixed(1)}s
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Draft content */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Purple "AI Draft" banner */}
        <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
          <Cpu size={12} />
          <span>AI-generated draft — review carefully before approving</span>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</label>
          {editing ? (
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <p className="mt-1 text-sm font-medium text-gray-900">{draft.subject || '—'}</p>
          )}
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Body</label>
          {editing ? (
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={14}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none font-mono"
            />
          ) : (
            <div className="mt-1 bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
              {draft.body_text || '—'}
            </div>
          )}
        </div>

        {/* Token info */}
        {(draft.prompt_tokens || draft.completion_tokens) && (
          <p className="text-xs text-gray-400">
            Tokens: {draft.prompt_tokens?.toLocaleString()} in / {draft.completion_tokens?.toLocaleString()} out
          </p>
        )}

        {/* Manager notes if rejected */}
        {draft.manager_notes && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            <p className="font-medium mb-0.5">Rejection note:</p>
            <p>{draft.manager_notes}</p>
          </div>
        )}

        {/* Reject flow */}
        {rejecting && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-red-800">Why are you rejecting this draft?</p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Optional — helps improve future drafts"
              rows={2}
              className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none resize-none bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => setRejecting(false)}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      {isPending && !rejecting && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(e => !e); }}
              className={cn(
                'px-3 py-2 text-sm rounded-lg border transition-colors',
                editing
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {editing ? 'Editing…' : 'Edit'}
            </button>
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={13} /> Regenerate
            </button>
            <button
              onClick={() => setRejecting(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X size={13} /> Reject
            </button>
          </div>
          <button
            onClick={handleApprove}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            {sending ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
            ) : (
              <><Check size={14} /> Approve &amp; Send</>
            )}
          </button>
        </div>
      )}

      {/* Sent/rejected summary footer */}
      {(draft.sent_at || draft.rejected_at) && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
          {draft.sent_at && <><Send size={11} className="text-green-500" /> Sent {formatDate(draft.sent_at)}</>}
          {draft.rejected_at && <><X size={11} className="text-red-500" /> Rejected {formatDate(draft.rejected_at)}</>}
        </div>
      )}
    </div>
  )
}

// ─── Draft list item ──────────────────────────────────────────────────────────

function DraftListItem({
  draft,
  caseInfo,
  selected,
  onClick,
}: {
  draft: MessageDraft
  caseInfo: ShipmentCase | null
  selected: boolean
  onClick: () => void
}) {
  const isPending = !draft.approved_at && !draft.rejected_at && !draft.sent_at

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors',
        selected && 'bg-blue-50 border-l-2 border-l-blue-500'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ChannelBadge type={draft.channel_type} />
            {isPending && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />}
          </div>
          <p className="text-xs font-medium text-gray-800 truncate">{draft.subject || '(no subject)'}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {caseInfo ? formatRef(caseInfo.ref_number) : '—'} · {draft.recipient_email}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-400">{formatDate(draft.created_at)}</p>
          <DraftStatusBadge draft={draft} />
        </div>
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterTab = 'pending' | 'sent' | 'rejected' | 'all'

export default function DraftsPage() {
  const [drafts, setDrafts]     = useState<MessageDraft[]>([])
  const [cases, setCases]       = useState<ShipmentCase[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter]     = useState<FilterTab>('pending')
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    const [draftsRes, casesRes] = await Promise.all([
      supabase.from('message_drafts').select('*').order('created_at', { ascending: false }),
      supabase.from('shipment_cases').select('id,ref_number,client_name,case_code'),
    ])
    setDrafts(draftsRes.data || [])
    setCases(casesRes.data as ShipmentCase[] || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime: new drafts arriving
  useEffect(() => {
    const channel = supabase
      .channel('drafts-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_drafts' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const caseMap = Object.fromEntries(cases.map(c => [c.id, c]))

  const filtered = drafts.filter(d => {
    if (filter === 'pending')  return !d.approved_at && !d.rejected_at && !d.sent_at
    if (filter === 'sent')     return !!d.sent_at
    if (filter === 'rejected') return !!d.rejected_at
    return true
  })

  const selectedDraft = drafts.find(d => d.id === selected) || null
  const pendingCount  = drafts.filter(d => !d.approved_at && !d.rejected_at && !d.sent_at).length

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'pending',  label: 'Pending' },
    { key: 'sent',     label: 'Sent' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All' },
  ]

  return (
    <div className="flex h-full">
      {/* Left — draft list */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">Drafts</span>
            </div>
            {pendingCount > 0 && (
              <span className="text-xs bg-purple-500 text-white rounded-full px-2 py-0.5">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex-1 py-2.5 text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <FileText size={24} className="text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No {filter} drafts</p>
            </div>
          )}
          {filtered.map(draft => (
            <DraftListItem
              key={draft.id}
              draft={draft}
              caseInfo={draft.case_id ? caseMap[draft.case_id] || null : null}
              selected={selected === draft.id}
              onClick={() => setSelected(draft.id)}
            />
          ))}
        </div>
      </div>

      {/* Right — draft detail */}
      <div className="flex-1 bg-white overflow-hidden">
        {!selectedDraft ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-3">
              <FileText size={22} className="text-purple-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">Select a draft to review</p>
            {pendingCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {pendingCount} draft{pendingCount > 1 ? 's' : ''} awaiting your approval
              </p>
            )}
            {pendingCount === 0 && (
              <p className="text-xs text-gray-400 mt-1">All caught up</p>
            )}
          </div>
        ) : (
          <DraftDetailPanel
            draft={selectedDraft}
            caseInfo={selectedDraft.case_id ? caseMap[selectedDraft.case_id] || null : null}
            onAction={() => { load(); setSelected(null) }}
          />
        )}
      </div>
    </div>
  )
}
