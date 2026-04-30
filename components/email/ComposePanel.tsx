'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Minus, Send, Maximize2 } from 'lucide-react'
import { EmailMessage } from '@/lib/types'
import { extractTextPreview } from '@/lib/utils'
import { toast } from 'sonner'

export type ComposeMode = 'compose' | 'reply' | 'replyAll' | 'forward'

interface ComposePanelProps {
  mode: ComposeMode
  replyTo?: EmailMessage
  initialDraft?: import('@/lib/types').MessageDraft
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

const MIN = { w: 360, h: 240 }

export default function ComposePanel({ mode, replyTo, initialDraft, onClose }: ComposePanelProps) {
  const [to,        setTo]        = useState(initialDraft?.recipient_email ?? (mode === 'reply' || mode === 'replyAll' ? (replyTo?.sender_email ?? '') : ''))
  const [cc,        setCc]        = useState(initialDraft?.cc_emails?.join(', ') ?? (mode === 'replyAll' ? (replyTo?.cc?.join(', ') ?? '') : ''))
  const [bcc,       setBcc]       = useState(initialDraft?.bcc_emails?.join(', ') ?? '')
  const [subject,   setSubject]   = useState(initialDraft?.subject ?? buildSubject(mode, replyTo?.subject ?? ''))
  const [body,      setBody]      = useState(initialDraft?.body_text ?? '')
  const [showCc,    setShowCc]    = useState(!!(initialDraft?.cc_emails?.length) || (mode === 'replyAll' && !!replyTo?.cc?.length))
  const [showBcc,   setShowBcc]   = useState(!!(initialDraft?.bcc_emails?.length))
  const [draftId,   setDraftId]   = useState<string | null>(initialDraft?.id ?? null)
  const [minimized,       setMinimized]       = useState(false)
  const [sending,         setSending]         = useState(false)
  const [confirmDiscard,  setConfirmDiscard]  = useState(false)
  const [size,            setSize]            = useState({ width: 560, height: 480 })
  const bodyRef = useRef<HTMLDivElement>(null)

  // Pre-fill body when reopening a saved draft
  useEffect(() => {
    if (initialDraft?.body_text && bodyRef.current) {
      bodyRef.current.innerHTML = initialDraft.body_text
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startResizeW(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = size.width
    const onMove = (ev: MouseEvent) => {
      const maxW = Math.floor(window.innerWidth * 0.85)
      setSize(s => ({ ...s, width: Math.max(MIN.w, Math.min(maxW, startW + (startX - ev.clientX))) }))
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function startResizeH(e: React.MouseEvent) {
    e.preventDefault()
    const startY = e.clientY
    const startH = size.height
    const onMove = (ev: MouseEvent) => {
      const maxH = Math.floor(window.innerHeight * 0.88)
      setSize(s => ({ ...s, height: Math.max(MIN.h, Math.min(maxH, startH + (startY - ev.clientY))) }))
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const isDirty = to.trim() || subject.trim() || body.trim()

  function getBodyContent() { return bodyRef.current?.innerHTML ?? body }
  function getBodyText()    { return bodyRef.current?.innerText  ?? body }

  async function saveDraft(): Promise<void> {
    const res = await fetch('/api/save-compose-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: draftId, to, cc, bcc, subject, body: getBodyContent() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(`Could not save draft: ${data.error ?? res.statusText}`)
      return
    }
    setDraftId(data.id)
    toast.success('Draft saved')
    onClose()
  }

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
        // Remove the saved draft now that it's been sent
        if (draftId) {
          fetch(`/api/save-compose-draft?id=${draftId}`, { method: 'DELETE' }).catch(() => {})
        }
        toast.success('Message sent')
        onClose()
      }
    } catch (err) {
      toast.error(`Send failed: ${String(err)}`)
    } finally {
      setSending(false)
    }
  }

  async function discardAndClose() {
    if (draftId) {
      await fetch(`/api/save-compose-draft?id=${draftId}`, { method: 'DELETE' }).catch(() => {})
    }
    onClose()
  }

  function handleDiscard() {
    if (isDirty) { setConfirmDiscard(true); return }
    discardAndClose()
  }

  function handleExpand() {
    setSize({
      width:  Math.floor(window.innerWidth  * 0.75),
      height: Math.floor(window.innerHeight * 0.85),
    })
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
    <div className="es-compose-panel" style={{ width: size.width, height: size.height }}>
      <div className="es-compose-resize-h" onMouseDown={startResizeH} />
      <div className="es-compose-resize-w" onMouseDown={startResizeW} />

      {/* Header */}
      <div className="es-compose-header">
        <span className="es-ch-title">{modeTitle(mode)}</span>
        <div className="es-ch-actions">
          <button title="Minimise" onClick={() => setMinimized(true)}><Minus size={12} /></button>
          <button title="Expand"   onClick={handleExpand}><Maximize2 size={12} /></button>
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
            <button className="es-cf-dismiss" title="Remove Cc" onClick={() => { setShowCc(false); setCc('') }}>
              <X size={10} />
            </button>
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
            <button className="es-cf-dismiss" title="Remove Bcc" onClick={() => { setShowBcc(false); setBcc('') }}>
              <X size={10} />
            </button>
          </div>
        )}

        {/* Subject */}
        <div className="es-compose-field-row es-subject-row">
          <span className="es-cf-label">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Add a subject"
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
          disabled={sending || confirmDiscard}
        >
          <Send size={14} />
          {sending ? 'Sending…' : 'Send'}
        </button>
        {confirmDiscard ? (
          <div className="es-cf-discard-confirm">
            <span>Save before closing?</span>
            <button className="es-cdc-cancel"   onClick={() => setConfirmDiscard(false)}>Cancel</button>
            <button className="es-cdc-save"     onClick={saveDraft}>Save Draft</button>
            <button className="es-cdc-confirm"  onClick={discardAndClose}>Discard</button>
          </div>
        ) : (
          <button className="es-cf-discard" onClick={handleDiscard}>
            Discard
          </button>
        )}
      </div>
    </div>
  )
}
