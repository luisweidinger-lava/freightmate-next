'use client'

import { useState, useMemo } from 'react'
import { EmailMessage } from '@/lib/types'
import { Star, Paperclip, Filter, ChevronDown, ChevronRight, AlertTriangle, Mail } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(seed: string | null | undefined): string {
  const palette = ['#0B5CAD', '#0F6E3F', '#B45309', '#2B5F8A', '#B23A48', '#1E5A5F', '#7A2E6C', '#4A5D3E']
  let h = 0
  for (let i = 0; i < (seed || '').length; i++) h = (h * 31 + (seed || '').charCodeAt(i)) % 997
  return palette[h % palette.length]
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function dateGroup(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'This week'
  return 'Older'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Older']

// ── Mail item ─────────────────────────────────────────────────────────────────

function MailItem({
  email, selected, checked, onSelect, onCheck, onStar,
}: {
  email: EmailMessage
  selected: boolean
  checked: boolean
  onSelect: () => void
  onCheck: (id: string, checked: boolean) => void
  onStar?: (email: EmailMessage) => void
}) {
  const [hovering, setHovering] = useState(false)

  // Determine channel type from email — stored on channel_id relation (inferred from direction/case)
  // channel_type is not directly on email_messages; we use a heuristic from the data shape
  // channel_type comes from the joined case_channels row (not a direct column on email_messages)
  const channelType: 'client' | 'vendor' | null =
    (email as any).case_channels?.channel_type ?? (email as any).channel_type ?? null

  return (
    <div
      className={`es-mail-item${selected ? ' selected' : ''}${!email.is_read ? ' unread' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Channel stripe */}
      {channelType && <span className={`es-channel-stripe ${channelType}`} />}

      {/* Unread dot */}
      {!email.is_read && !checked && !hovering && (
        <span className="es-unread-dot" />
      )}

      {/* Checkbox on hover */}
      {(hovering || checked) && (
        <input
          type="checkbox"
          checked={checked}
          style={{ position: 'absolute', left: 4, top: 12, width: 12, height: 12, cursor: 'pointer', accentColor: 'var(--es-brand)' }}
          onChange={e => { e.stopPropagation(); onCheck(email.id, e.target.checked) }}
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Avatar */}
      <div
        className="es-avatar"
        style={{ background: avatarColor(email.sender_email) }}
      >
        {initials(email.sender_email?.split('@')[0])}
      </div>

      {/* Body */}
      <div className="es-mail-body">
        <div className="es-row-1">
          <span className="es-sender">{email.sender_email || '(unknown)'}</span>
          {(email as any).priority === 'urgent' && (
            <span className="es-priority-dot urgent" title="Urgent" />
          )}
          {(email as any).priority === 'high' && (
            <span className="es-priority-dot high" title="High" />
          )}
          <button
            className={`es-star-btn${email.is_starred ? ' starred' : ''}`}
            onClick={e => { e.stopPropagation(); onStar?.(email) }}
          >
            <Star size={12} style={email.is_starred ? { color: '#C99A00', fill: '#C99A00' } : undefined} />
          </button>
          {email.has_attachments && <Paperclip size={12} style={{ color: 'var(--es-n-300)', flexShrink: 0 }} />}
          <span className="es-time">{timeOnly(email.created_at)}</span>
        </div>

        <div className={`es-subject${email.is_read ? ' read' : ''}`}>
          {email.subject || '(no subject)'}
        </div>

        <div className="es-preview">
          {email.body_preview || ''}
        </div>

        <div className="es-badges">
          {email.case_id && (email as any).ref_number && (
            <span className="es-ref-tag">#{(email as any).ref_number}</span>
          )}
          {channelType === 'client' && <span className="es-pill client">Client</span>}
          {channelType === 'vendor' && <span className="es-pill vendor">Vendor</span>}
          {!email.case_id && <span className="es-pill high">Unmatched</span>}
        </div>
      </div>
    </div>
  )
}

// ── EmailList ─────────────────────────────────────────────────────────────────

export interface EmailListProps {
  emails: EmailMessage[]
  selected: EmailMessage | null
  selectedIds: Set<string>
  loading: boolean
  filter: 'all' | 'unread' | 'unmatched' | 'client' | 'vendor'
  search: string
  style?: React.CSSProperties
  onSelect: (email: EmailMessage) => void
  onCheck: (id: string, checked: boolean) => void
  onFilterChange: (f: 'all' | 'unread' | 'unmatched' | 'client' | 'vendor') => void
  onSearchChange: (s: string) => void
  onBulkRead: () => void
  onBulkSpam: () => void
  onBulkBin: () => void
  onClearSelection: () => void
  onStar?: (email: EmailMessage) => void
}

export default function EmailList({
  emails, selected, selectedIds, loading, filter, style,
  onSelect, onCheck, onBulkRead, onBulkSpam, onBulkBin, onClearSelection, onStar,
}: EmailListProps) {
  const [focusedTab, setFocusedTab] = useState<'focused' | 'other'>('focused')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const out: Record<string, EmailMessage[]> = {}
    emails.forEach(e => {
      const g = dateGroup(e.created_at)
      if (!out[g]) out[g] = []
      out[g].push(e)
    })
    return out
  }, [emails])

  function toggleGroup(g: string) {
    setCollapsed(prev => ({ ...prev, [g]: !prev[g] }))
  }

  return (
    <div className="es-list-col" style={style}>
      {/* List header: Focused / Other tabs + actions */}
      <div className="es-list-header">
        <div className="es-list-tabs">
          <div
            className={`es-list-tab${focusedTab === 'focused' ? ' active' : ''}`}
            onClick={() => setFocusedTab('focused')}
          >
            Focused
          </div>
          <div
            className={`es-list-tab${focusedTab === 'other' ? ' active' : ''}`}
            onClick={() => setFocusedTab('other')}
          >
            Other
          </div>
          <div className="es-list-actions">
            <button title="Filter"><Filter size={13} /></button>
            <button title="Sort"><ChevronDown size={13} /></button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="es-bulk-bar">
            <span>{selectedIds.size} selected</span>
            <button onClick={onBulkRead}>Mark read</button>
            <button onClick={onBulkSpam}>Spam</button>
            <button onClick={onBulkBin} style={{ color: 'var(--es-urgent)' }}>Bin</button>
            <button onClick={onClearSelection} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--es-n-400)', fontSize: 11 }}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Mail scroll */}
      <div className="es-mail-scroll">
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--es-n-150)', borderTopColor: 'var(--es-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && emails.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8, color: 'var(--es-n-300)' }}>
            <Mail size={28} />
            <span style={{ fontSize: 13, color: 'var(--es-n-400)' }}>No messages</span>
          </div>
        )}

        {!loading && GROUP_ORDER.map(g => {
          const items = groups[g]
          if (!items?.length) return null
          const isCollapsed = collapsed[g]
          return (
            <div key={g}>
              <div className="es-date-group" onClick={() => toggleGroup(g)}>
                {isCollapsed
                  ? <ChevronRight size={11} />
                  : <ChevronDown size={11} />}
                {g}
              </div>
              {!isCollapsed && items.map(email => (
                <MailItem
                  key={email.id}
                  email={email}
                  selected={selected?.id === email.id}
                  checked={selectedIds.has(email.id)}
                  onSelect={() => onSelect(email)}
                  onCheck={onCheck}
                  onStar={onStar}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
