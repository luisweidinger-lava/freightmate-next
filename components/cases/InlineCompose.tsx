'use client'

import { useState } from 'react'
import { Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  channelType: 'client' | 'vendor'
  caseId: string
  channelId: string | null
  defaultTo: string
  defaultSubject: string
  replyToNylasMessageId: string | null
  onSent: () => void
}

export function InlineCompose({
  channelType, caseId, channelId,
  defaultTo, defaultSubject, replyToNylasMessageId, onSent,
}: Props) {
  const [body,     setBody]     = useState('')
  const [subject,  setSubject]  = useState(defaultSubject)
  const [extraTo,  setExtraTo]  = useState('')
  const [cc,       setCc]       = useState('')
  const [bcc,      setBcc]      = useState('')
  const [sending,  setSending]  = useState(false)
  const [drafting, setDrafting] = useState(false)

  const borderAccent = channelType === 'client' ? 'border-blue-400' : 'border-slate-400'
  const sendBtnCls   = channelType === 'client'
    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
    : 'bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400'

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    try {
      // Build to list: locked defaultTo + any extra addresses
      const extraAddresses = extraTo.split(',').map(s => s.trim()).filter(Boolean)
      const toList = [defaultTo, ...extraAddresses]

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:  toList,
          cc:  cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject,
          body,
          replyToNylasMessageId,
          case_id:    caseId,
          channel_id: channelId ?? undefined,
        }),
      })
      if (res.ok) {
        toast.success('Email sent')
        setBody('')
        setExtraTo('')
        setCc('')
        setBcc('')
        onSent()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to send email')
      }
    } finally {
      setSending(false)
    }
  }

  async function handleGenerateDraft() {
    setDrafting(true)
    try {
      const res = await fetch('/api/request-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, channel_type: channelType, channel_id: channelId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Draft request failed: ${data.error ?? res.statusText}`)
      } else {
        toast.success('AI draft requested — check back in ~60s')
      }
    } catch (err) {
      toast.error(`Draft request failed: ${String(err)}`)
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div className={cn('border-t-2 bg-white/70 backdrop-blur-sm p-3 space-y-2 flex-shrink-0', borderAccent)}>
      {/* Recipient fields */}
      <div className="grid grid-cols-[32px_1fr] gap-x-2 gap-y-1 text-xs">
        {/* To — locked chip + optional extra addresses */}
        <span className="text-gray-400 font-medium self-center">To</span>
        <div className="flex items-center flex-wrap gap-1 min-h-[22px]">
          {/* Locked primary recipient */}
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-700 rounded px-2 py-0.5 border border-gray-200 flex-shrink-0">
            {defaultTo || '—'}
            <X size={9} className="text-gray-300 cursor-default" aria-hidden />
          </span>
          <input
            value={extraTo}
            onChange={e => setExtraTo(e.target.value)}
            placeholder="Add recipients…"
            className="flex-1 min-w-[120px] bg-transparent text-gray-600 text-xs focus:outline-none"
          />
        </div>

        {/* CC */}
        <span className="text-gray-400 font-medium self-center">CC</span>
        <input
          value={cc}
          onChange={e => setCc(e.target.value)}
          placeholder="CC addresses…"
          className="bg-transparent text-gray-600 text-xs focus:outline-none border-b border-gray-100 focus:border-violet-300 pb-0.5 transition-colors"
        />

        {/* BCC */}
        <span className="text-gray-400 font-medium self-center">BCC</span>
        <input
          value={bcc}
          onChange={e => setBcc(e.target.value)}
          placeholder="BCC addresses…"
          className="bg-transparent text-gray-600 text-xs focus:outline-none border-b border-gray-100 focus:border-violet-300 pb-0.5 transition-colors"
        />

        {/* Subject */}
        <span className="text-gray-400 font-medium self-center">Subj.</span>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="bg-transparent text-gray-700 text-xs focus:outline-none border-b border-gray-200 focus:border-violet-400 pb-0.5 transition-colors"
          placeholder="Subject…"
        />
      </div>

      {/* Body textarea */}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={3}
        placeholder="Write your reply…"
        className="w-full text-xs text-gray-700 bg-white/80 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300/40 focus:border-violet-400 transition-colors placeholder:text-gray-300 font-[Figtree,sans-serif]"
      />

      {/* Action row */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerateDraft}
          disabled={drafting}
          className="flex items-center gap-1.5 text-xs border border-violet-200 text-violet-700 bg-violet-50/60 px-3 py-1.5 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition-colors font-medium"
        >
          <Sparkles size={11} className={drafting ? 'animate-spin' : ''} />
          {drafting ? 'Requesting…' : 'Generate AI Draft'}
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className={cn(
            'flex items-center gap-1.5 text-xs text-white px-4 py-1.5 rounded-lg ml-auto transition-colors font-semibold disabled:opacity-50',
            sendBtnCls,
          )}
        >
          <Send size={11} />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
