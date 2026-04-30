'use client'

import { ChevronDown, ChevronRight, Paperclip, Reply, ReplyAll, Forward } from 'lucide-react'
import { EmailMessage } from '@/lib/types'
import MailBodyRenderer from '@/components/email/MailBodyRenderer'

// ── Shared helpers (used by inbox + workbench) ────────────────────────────────

export function avatarColor(seed: string | null | undefined): string {
  const palette = ['#0B5CAD', '#0F6E3F', '#B45309', '#2B5F8A', '#B23A48', '#1E5A5F', '#7A2E6C', '#4A5D3E']
  let h = 0
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + (seed || '').charCodeAt(i)) % 997
  return palette[h % palette.length]
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function fullDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Expanded message bubble ───────────────────────────────────────────────────

export function MsgExpanded({
  msg, isLatest, onCollapse, onReply,
}: {
  msg: EmailMessage
  isLatest: boolean
  onCollapse?: () => void
  onReply?: (mode: 'reply' | 'replyAll' | 'forward') => void
}) {
  return (
    <div className="es-msg">
      <div className="es-msg-header">
        <div className="es-msg-avatar" style={{ background: avatarColor(msg.sender_email) }}>
          {initials(msg.sender_email?.split('@')[0])}
        </div>
        <div>
          <div className="es-msg-from">
            {msg.sender_email?.split('@')[0] || 'Unknown'}
            <span className="es-from-email">&lt;{msg.sender_email}&gt;</span>
            {(msg as any).channel_type === 'client' && <span className="es-pill client">Client</span>}
            {(msg as any).channel_type === 'vendor' && <span className="es-pill vendor">Vendor</span>}
          </div>
          <div className="es-msg-to">to {msg.recipient_email}</div>
        </div>
        <div>
          <div className="es-msg-date">{fullDate(msg.created_at)}</div>
          <div className="es-msg-inline-actions">
            {onReply && <button title="Reply" onClick={() => onReply('reply')}><Reply size={13} /></button>}
            {onReply && <button title="Reply all" onClick={() => onReply('replyAll')}><ReplyAll size={13} /></button>}
            {onReply && <button title="Forward" onClick={() => onReply('forward')}><Forward size={13} /></button>}
            {onCollapse && (
              <button title="Collapse" onClick={onCollapse}><ChevronDown size={13} /></button>
            )}
          </div>
        </div>
      </div>
      <div className="es-msg-body">
        <MailBodyRenderer body={msg.body_text} preview={msg.body_preview} />
      </div>
      {msg.has_attachments && (
        <div className="es-attachments">
          <div className="es-attachment"><Paperclip size={12} /> Attachment</div>
        </div>
      )}
    </div>
  )
}

// ── Collapsed message row ─────────────────────────────────────────────────────

export function MsgCollapsed({ msg, onExpand }: { msg: EmailMessage; onExpand: () => void }) {
  return (
    <div className="es-thread-collapsed" onClick={onExpand}>
      <div className="es-mini-avatar" style={{ background: avatarColor(msg.sender_email) }}>
        {initials(msg.sender_email?.split('@')[0])}
      </div>
      <span className="who">{msg.sender_email?.split('@')[0]}</span>
      <span className="prev">{msg.body_preview || msg.subject || '—'}</span>
      <span style={{ fontSize: 11, color: 'var(--es-n-400)', whiteSpace: 'nowrap' }}>{fullDate(msg.created_at)}</span>
      <ChevronRight size={12} style={{ color: 'var(--es-n-300)' }} />
    </div>
  )
}
