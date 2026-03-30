'use client'

import { useState } from 'react'
import { X, Minus, Send, FileText, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmailMessage } from '@/lib/types'
import { extractTextPreview } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type ComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward'

interface ComposePanelProps {
  mode: ComposeMode
  replyTo?: EmailMessage
  onClose: () => void
}

function modeTitle(mode: ComposeMode) {
  if (mode === 'reply')    return 'Reply'
  if (mode === 'replyAll') return 'Reply All'
  if (mode === 'forward')  return 'Forward'
  return 'New Message'
}

function buildSubject(mode: ComposeMode, original?: string): string {
  if (!original) return ''
  if (mode === 'reply' || mode === 'replyAll') {
    return original.startsWith('Re:') ? original : `Re: ${original}`
  }
  if (mode === 'forward') {
    return original.startsWith('Fwd:') ? original : `Fwd: ${original}`
  }
  return ''
}

export default function ComposePanel({ mode, replyTo, onClose }: ComposePanelProps) {
  const [to,      setTo]      = useState(mode === 'reply' || mode === 'replyAll' ? (replyTo?.sender_email ?? '') : '')
  const [cc,      setCc]      = useState(mode === 'replyAll' ? (replyTo?.cc?.join(', ') ?? '') : '')
  const [bcc,     setBcc]     = useState('')
  const [subject, setSubject] = useState(buildSubject(mode, replyTo?.subject ?? ''))
  const [body,    setBody]    = useState('')
  const [showCc,  setShowCc]  = useState(mode === 'replyAll' && !!replyTo?.cc?.length)
  const [showBcc, setShowBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const isDirty = to.trim() || subject.trim() || body.trim()

  const quotedBody = replyTo
    ? `\n\n────────────────────────────────\nOn ${new Date(replyTo.created_at).toLocaleString('en-GB')}, ${replyTo.sender_email} wrote:\n\n${extractTextPreview(replyTo.body_text || replyTo.body_preview, 800)}`
    : ''

  async function handleSend() {
    if (!to.trim()) { toast.error('Please enter a recipient'); return }
    if (!subject.trim()) { toast.error('Please enter a subject'); return }
    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:              to.trim(),
          cc:              cc.trim() || undefined,
          bcc:             bcc.trim() || undefined,
          subject:         subject.trim(),
          body:            body + quotedBody,
          replyToNylasMessageId: replyTo?.nylas_message_id ?? undefined,
          case_id:         replyTo?.case_id ?? undefined,
        }),
      })
      if (res.ok) {
        toast.success('Email sent')
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to send — check server logs')
      }
    } finally {
      setSending(false)
    }
  }

  async function handleSaveDraft() {
    const { error } = await supabase.from('email_messages').insert({
      folder:           'drafts',
      direction:        'outbound',
      subject:          subject.trim() || '(no subject)',
      body_text:        body + quotedBody,
      body_preview:     body.slice(0, 200),
      recipient_email:  to.trim(),
      sender_email:     'freightmate58@gmail.com',
      is_read:          true,
      has_attachments:  false,
      nylas_message_id: `draft_${crypto.randomUUID()}`,
    })
    if (error) { toast.error('Failed to save draft: ' + error.message); return }
    toast.success('Draft saved')
    onClose()
  }

  function handleDiscard() {
    if (isDirty && !confirm('Discard this message?')) return
    onClose()
  }

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50 w-72 bg-gray-800 text-white rounded-t-lg shadow-2xl">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium hover:bg-gray-700 rounded-t-lg transition-colors"
        >
          <span className="truncate">{subject || modeTitle(mode)}</span>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <Minus size={14} />
            <X size={14} onClick={(e) => { e.stopPropagation(); handleDiscard() }} />
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 right-6 z-50 w-[560px] bg-white rounded-t-xl shadow-2xl border border-gray-200 border-b-0 flex flex-col" style={{ maxHeight: '85vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 text-white rounded-t-xl flex-shrink-0">
        <span className="text-sm font-medium">{modeTitle(mode)}</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setMinimized(true)} className="hover:text-gray-300 transition-colors">
            <Minus size={14} />
          </button>
          <button onClick={handleDiscard} className="hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="border-b border-gray-200 flex-shrink-0">
        {/* To */}
        <div className="flex items-center border-b border-gray-100 px-4">
          <span className="text-xs text-gray-400 w-10 flex-shrink-0">To</span>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 text-sm py-2.5 focus:outline-none"
          />
          {(!showCc || !showBcc) && (
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {!showCc && (
                <button onClick={() => setShowCc(true)} className="text-xs text-gray-400 hover:text-gray-600">
                  + CC
                </button>
              )}
              {!showBcc && (
                <button onClick={() => setShowBcc(true)} className="text-xs text-gray-400 hover:text-gray-600">
                  + BCC
                </button>
              )}
            </div>
          )}
        </div>

        {/* CC (expandable) */}
        {showCc && (
          <div className="flex items-center border-b border-gray-100 px-4">
            <span className="text-xs text-gray-400 w-10 flex-shrink-0">CC</span>
            <input
              type="text"
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 text-sm py-2.5 focus:outline-none"
            />
          </div>
        )}

        {/* BCC (expandable) */}
        {showBcc && (
          <div className="flex items-center border-b border-gray-100 px-4">
            <span className="text-xs text-gray-400 w-10 flex-shrink-0">BCC</span>
            <input
              type="text"
              value={bcc}
              onChange={e => setBcc(e.target.value)}
              placeholder="bcc@example.com"
              className="flex-1 text-sm py-2.5 focus:outline-none"
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center px-4">
          <span className="text-xs text-gray-400 w-10 flex-shrink-0">Subj</span>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-sm py-2.5 focus:outline-none font-medium"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your message…"
          className="w-full h-full min-h-[180px] text-sm px-4 py-3 focus:outline-none resize-none leading-relaxed"
        />

        {/* Quoted original */}
        {replyTo && (
          <div className="px-4 pb-4">
            <div className="border-l-2 border-gray-200 pl-3 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">
              <p className="font-medium text-gray-500 mb-1">
                On {new Date(replyTo.created_at).toLocaleString('en-GB')}, {replyTo.sender_email} wrote:
              </p>
              {extractTextPreview(replyTo.body_text || replyTo.body_preview, 600)}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          <Send size={13} />
          {sending ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={sending}
          className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <FileText size={13} />
          Save draft
        </button>
        <button
          onClick={handleDiscard}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
