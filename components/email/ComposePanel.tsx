'use client'

import { useState, useRef } from 'react'
import { X, Minus, Send } from 'lucide-react'
import { EmailMessage } from '@/lib/types'
import { extractTextPreview } from '@/lib/utils'
import { toast } from 'sonner'

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
  const [to,        setTo]        = useState(mode === 'reply' || mode === 'replyAll' ? (replyTo?.sender_email ?? '') : '')
  const [cc,        setCc]        = useState(mode === 'replyAll' ? (replyTo?.cc?.join(', ') ?? '') : '')
  const [bcc,       setBcc]       = useState('')
  const [subject,   setSubject]   = useState(buildSubject(mode, replyTo?.subject ?? ''))
  const [body,      setBody]      = useState('')
  const [showCc,    setShowCc]    = useState(mode === 'replyAll' && !!replyTo?.cc?.length)
  const [showBcc,   setShowBcc]   = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [sending,   setSending]   = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const isDirty = to.trim() || subject.trim() || body.trim()

  function getBodyContent() { return bodyRef.current?.innerHTML ?? body }
  function getBodyText()    { return bodyRef.current?.innerText  ?? body }

  async function handleSend() {
    if (!to.trim() || !getBodyText().trim()) {
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
          cc:  cc  ? cc.split(',').map(s => s.trim()).filter(Boolean)  : [],
          bcc: bcc ? bcc.split(',').map(s => s.trim()).filter(Boolean) : [],
          subject,
          body: getBodyContent(),
          replyToNylasMessageId: replyTo?.nylas_message_id ?? null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Send failed: ${data.error ?? res.statusText}`)
      } else {
        toast.success('Message sent')
        onClose()
      }
    } catch (err) {
      toast.error(`Send failed: ${String(err)}`)
    } finally {
      setSending(false)
    }
  }

  function handleDiscard() {
    if (isDirty && !confirm('Discard this message?')) return
    onClose()
  }

  // ── Minimized pill ──────────────────────────────────────────────────────────

  if (minimized) {
    return (
      <div className="es-compose-panel es-minimized" onClick={() => setMinimized(false)}>
        <div className="es-compose-header" style={{ cursor: 'pointer' }}>
          <span className="es-ch-title">{subject || modeTitle(mode)}</span>
          <div className="es-ch-actions" onClick={e => e.stopPropagation()}>
            <button title="Restore"><Minus size={12} /></button>
            <button title="Discard" onClick={handleDiscard}><X size={12} /></button>
          </div>
        </div>
      </div>
    )
  }

  // ── Full panel ──────────────────────────────────────────────────────────────

  return (
    <div className="es-compose-panel">

      {/* Header */}
      <div className="es-compose-header">
        <span className="es-ch-title">{modeTitle(mode)}</span>
        <div className="es-ch-actions">
          <button title="Minimise" onClick={() => setMinimized(true)}><Minus size={12} /></button>
          <button title="Discard"  onClick={handleDiscard}><X size={12} /></button>
        </div>
      </div>

      {/* Address fields */}
      <div className="es-compose-fields">

        {/* To */}
        <div className="es-compose-field-row">
          <span className="es-cf-label">To</span>
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            autoFocus
          />
          {(!showCc || !showBcc) && (
            <div className="es-cf-toggles">
              {!showCc  && <button onClick={() => setShowCc(true)}>Cc</button>}
              {!showBcc && <button onClick={() => setShowBcc(true)}>Bcc</button>}
            </div>
          )}
        </div>

        {/* CC */}
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

        {/* BCC */}
        {showBcc && (
          <div className="es-compose-field-row">
            <span className="es-cf-label">Bcc</span>
            <input
              type="text"
              value={bcc}
              onChange={e => setBcc(e.target.value)}
              placeholder="bcc@example.com"
            />
          </div>
        )}

        {/* Subject */}
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

      {/* Body */}
      <div className="es-compose-body-wrap">
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          onInput={e => setBody((e.target as HTMLElement).innerText)}
          className="es-compose-body"
          data-placeholder="Write your message…"
        />

        {/* Quoted original for replies/forwards */}
        {replyTo && (
          <div className="es-compose-quoted">
            <p className="es-cq-meta">
              On {new Date(replyTo.created_at).toLocaleString('en-GB')}, {replyTo.sender_email} wrote:
            </p>
            {extractTextPreview(replyTo.body_text || replyTo.body_preview, 600)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="es-compose-footer">
        <button
          className="es-cf-send"
          onClick={handleSend}
          disabled={sending}
        >
          <Send size={12} />
          {sending ? 'Sending…' : 'Send'}
        </button>
        <button className="es-cf-discard" onClick={handleDiscard}>
          Discard
        </button>
      </div>
    </div>
  )
}
