'use client'

import { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
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
  const [sending,  setSending]  = useState(false)
  const [drafting, setDrafting] = useState(false)

  const borderAccent = channelType === 'client' ? 'border-sky-400' : 'border-orange-400'
  const sendBtnCls   = channelType === 'client'
    ? 'bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300'
    : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300'

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: defaultTo,
          subject,
          body,
          replyToNylasMessageId,
        }),
      })
      if (res.ok) {
        toast.success('Email sent')
        setBody('')
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
      await fetch('/api/request-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, channel_type: channelType, channel_id: channelId }),
      })
      toast.success('AI draft requested — check back in ~60s')
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div className={cn('border-t-2 bg-white/70 backdrop-blur-sm p-3 space-y-2 flex-shrink-0', borderAccent)}>
      {/* To + Subject header */}
      <div className="grid grid-cols-[32px_1fr] gap-x-2 gap-y-1 text-xs">
        <span className="text-gray-400 font-medium self-center">To</span>
        <span className="text-gray-600 truncate font-medium">{defaultTo || '—'}</span>
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
