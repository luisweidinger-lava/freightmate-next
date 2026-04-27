'use client'

import { useState } from 'react'
import { Send, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  channelType: 'client' | 'vendor' | 'other'
  caseId: string
  channelId: string | null
  defaultTo: string
  defaultSubject: string
  replyToNylasMessageId?: string | null
  onSent: () => void
  onChannelCreated?: () => void
}

export function InlineCompose({
  channelType, caseId, channelId,
  defaultTo, defaultSubject, replyToNylasMessageId, onSent, onChannelCreated,
}: Props) {
  const [primaryTo, setPrimaryTo] = useState(defaultTo)
  const [body,     setBody]     = useState('')
  const [subject,  setSubject]  = useState(defaultSubject)
  const [extraTo,  setExtraTo]  = useState('')
  const [cc,       setCc]       = useState('')
  const [bcc,      setBcc]      = useState('')
  const [sending,  setSending]  = useState(false)
  const [drafting, setDrafting] = useState(false)

  async function handleSend() {
    if (!body.trim()) return
    const toEmail = defaultTo || primaryTo
    if (!toEmail.trim()) { toast.error('Enter a recipient email'); return }
    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:                    toEmail,
          cc:                    cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : [],
          bcc:                   bcc ? bcc.split(',').map(s => s.trim()).filter(Boolean) : [],
          subject,
          body,
          replyToNylasMessageId: replyToNylasMessageId ?? null,
          case_id:               caseId,
          channel_id:            channelId,
          create_channel_type:   channelId === null ? channelType : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(`Send failed: ${data.error ?? res.statusText}`)
      } else {
        toast.success('Message sent')
        setBody('')
        if (!channelId) onChannelCreated?.()
        onSent()
      }
    } catch (err) {
      toast.error(`Send failed: ${String(err)}`)
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

  // 'other' channels use the client colour scheme in the compose area
  const composeClass = channelType === 'other' ? 'client' : channelType

  return (
    <div className={`wb-compose ${composeClass}`}>
      <div className="wb-compose-grid">
        {/* To */}
        <span className="wb-compose-label">To</span>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, minHeight: 22 }}>
          {defaultTo ? (
            <>
              <span className="wb-compose-to-chip">
                {defaultTo}
                <X size={9} style={{ color: 'var(--es-n-200)' }} aria-hidden />
              </span>
              <input
                value={extraTo}
                onChange={e => setExtraTo(e.target.value)}
                placeholder="Add recipients…"
                className="wb-compose-input"
                style={{ flex: 1, minWidth: 120, borderBottom: 'none' }}
              />
            </>
          ) : (
            <input
              value={primaryTo}
              onChange={e => setPrimaryTo(e.target.value)}
              placeholder="Recipient email…"
              className="wb-compose-input"
              style={{ flex: 1 }}
            />
          )}
        </div>

        {/* CC */}
        <span className="wb-compose-label">CC</span>
        <input
          value={cc}
          onChange={e => setCc(e.target.value)}
          placeholder="CC addresses…"
          className="wb-compose-input"
        />

        {/* BCC */}
        <span className="wb-compose-label">BCC</span>
        <input
          value={bcc}
          onChange={e => setBcc(e.target.value)}
          placeholder="BCC addresses…"
          className="wb-compose-input"
        />

        {/* Subject */}
        <span className="wb-compose-label">Subj.</span>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject…"
          className="wb-compose-input"
        />
      </div>

      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={3}
        placeholder="Write your reply…"
        className="wb-compose-textarea"
      />

      <div className="wb-compose-actions">
        <button
          onClick={handleGenerateDraft}
          disabled={drafting}
          className="wb-compose-btn-draft"
        >
          <Sparkles size={11} style={drafting ? { animation: 'spin 0.8s linear infinite' } : {}} />
          {drafting ? 'Requesting…' : 'Generate AI Draft'}
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="wb-compose-btn-send"
        >
          <Send size={11} />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
