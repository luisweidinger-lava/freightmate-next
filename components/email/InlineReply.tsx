'use client'

import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { EmailMessage } from '@/lib/types'
import { extractTextPreview } from '@/lib/utils'
import { toast } from 'sonner'

interface InlineReplyProps {
  mode: 'reply' | 'replyAll' | 'forward'
  replyTo: EmailMessage
  onSent: () => void
  onDiscard: () => void
}

function buildSubject(mode: 'reply' | 'replyAll' | 'forward', original?: string): string {
  if (!original) return ''
  if (mode === 'reply' || mode === 'replyAll') return original.startsWith('Re:') ? original : `Re: ${original}`
  return original.startsWith('Fwd:') ? original : `Fwd: ${original}`
}

export default function InlineReply({ mode, replyTo, onSent, onDiscard }: InlineReplyProps) {
  const isForward = mode === 'forward'
  const [to,      setTo]      = useState(isForward ? '' : (replyTo.sender_email ?? ''))
  const [cc,      setCc]      = useState(mode === 'replyAll' ? (replyTo.cc?.join(', ') ?? '') : '')
  const [showCc,  setShowCc]  = useState(mode === 'replyAll' && !!replyTo.cc?.length)
  const [subject, setSubject] = useState(buildSubject(mode, replyTo.subject ?? ''))
  const [sending, setSending] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  async function handleSend() {
    const bodyText = bodyRef.current?.innerText?.trim() ?? ''
    if (!to.trim() || !bodyText) {
      toast.error('To and body are required')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : [],
          subject,
          body: bodyRef.current?.innerHTML ?? bodyText,
          replyToNylasMessageId: replyTo.nylas_message_id ?? null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Send failed: ${data.error ?? res.statusText}`)
      } else {
        toast.success('Message sent')
        onSent()
      }
    } catch (err) {
      toast.error(`Send failed: ${String(err)}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="es-inline-reply">
      <div className="es-compose-fields">
        <div className="es-compose-field-row">
          <span className="es-cf-label">To</span>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            autoFocus
          />
          {!showCc && (
            <div className="es-cf-toggles">
              <button onClick={() => setShowCc(true)}>Cc</button>
            </div>
          )}
        </div>

        {showCc && (
          <div className="es-compose-field-row">
            <span className="es-cf-label">Cc</span>
            <input
              type="text"
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="cc@example.com"
            />
          </div>
        )}

        <div className="es-compose-field-row es-subject-row">
          <span className="es-cf-label">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
          />
        </div>
      </div>

      <div className="es-compose-body-wrap">
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          className="es-compose-body"
          data-placeholder="Write your reply…"
        />
        <div className="es-compose-quoted">
          <p className="es-cq-meta">
            On {new Date(replyTo.created_at).toLocaleString('en-GB')}, {replyTo.sender_email} wrote:
          </p>
          {extractTextPreview(replyTo.body_text || replyTo.body_preview, 600)}
        </div>
      </div>

      <div className="es-compose-footer">
        <button className="es-cf-send" onClick={handleSend} disabled={sending}>
          <Send size={12} />
          {sending ? 'Sending…' : 'Send'}
        </button>
        <button className="es-cf-discard" onClick={onDiscard}>Discard</button>
      </div>
    </div>
  )
}
