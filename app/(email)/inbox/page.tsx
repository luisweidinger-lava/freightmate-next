'use client'

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EmailMessage } from '@/lib/types'
import { toast } from 'sonner'
import EmailList from '@/components/email/EmailList'
import EmailDetail from '@/components/email/EmailDetail'
import { Mail } from 'lucide-react'
import { useUser } from '@/components/UserProvider'

// ── Nylas move helper ─────────────────────────────────────────────────────────

async function nylasMove(email: EmailMessage, folder: 'TRASH' | 'SPAM') {
  const id = email.nylas_message_id
  if (!id || id.startsWith('local_') || id.startsWith('draft_')) return
  try {
    await fetch('/api/nylas-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: id, folder }),
    })
  } catch { /* fire-and-forget */ }
}

// ── Inbox content ─────────────────────────────────────────────────────────────

function InboxContent() {
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter')
  const idParam = searchParams.get('id')

  const { mailboxId } = useUser()
  const [emails, setEmails] = useState<EmailMessage[]>([])
  const [selected, setSelected] = useState<EmailMessage | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'unmatched' | 'client' | 'vendor'>(
    filterParam === 'unmatched' ? 'unmatched'
    : filterParam === 'unread'  ? 'unread'
    : filterParam === 'client'  ? 'client'
    : filterParam === 'vendor'  ? 'vendor'
    : 'all'
  )
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const LIST_WIDTH_KEY = 'fm_list_width'
  const [listWidth, setListWidth] = useState(360)
  useEffect(() => {
    try { const s = Number(localStorage.getItem(LIST_WIDTH_KEY)); if (s) setListWidth(s) } catch { /* ignore */ }
  }, [])

  // Keep ref in sync so load() can check selection without it as a dep
  useEffect(() => { selectedIdRef.current = selected?.id ?? null }, [selected])

  // Sync filter with URL param changes
  useEffect(() => {
    if      (filterParam === 'unmatched') setFilter('unmatched')
    else if (filterParam === 'unread')    setFilter('unread')
    else if (filterParam === 'client')    setFilter('client')
    else if (filterParam === 'vendor')    setFilter('vendor')
    else                                  setFilter('all')
  }, [filterParam])

  const load = useCallback(async () => {
    if (mailboxId === undefined) return
    setLoading(true)

    // For client/vendor smart views: INNER JOIN so only emails already linked to a
    // channel of the right type are returned. Unlinked emails (channel_id null) are excluded.
    // For all other views: LEFT JOIN so channel_type is available for stripes/pills
    // without excluding unlinked emails.
    const joinType = (filter === 'client' || filter === 'vendor') ? '!inner' : ''
    let query = supabase
      .from('email_messages')
      .select(`*, case_channels!channel_id${joinType}(channel_type)`)
      .eq('folder', 'inbox')
      .order('created_at', { ascending: false })

    if (mailboxId)              query = query.eq('mailbox_id', mailboxId)
    if (filter === 'unread')    query = query.eq('is_read', false)
    if (filter === 'unmatched') query = query.is('case_id', null)
    if (filter === 'client')    query = (query as any).eq('case_channels.channel_type', 'client')
    if (filter === 'vendor')    query = (query as any).eq('case_channels.channel_type', 'vendor')

    const { data } = await query
    const list = (data || []) as EmailMessage[]
    setEmails(list)

    // Refresh selected with latest data; clear only if email left the list entirely
    if (selectedIdRef.current) {
      const refreshed = list.find(e => e.id === selectedIdRef.current)
      setSelected(refreshed ?? null)
    }

    if (idParam) {
      const found = list.find(e => e.id === idParam)
      if (found) setSelected(found)
    }
    setLoading(false)
  }, [filter, idParam, mailboxId])

  useEffect(() => { load() }, [load])

  // Realtime — only INSERT events to avoid reload loop when marking as read
  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'email_messages' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  // Auto-mark as read when selected
  useEffect(() => {
    if (selected && !selected.is_read) {
      ;(async () => {
        const { error } = await supabase.from('email_messages').update({ is_read: true }).eq('id', selected.id)
        if (error) { toast.error('Failed to mark as read'); return }
        setSelected(prev => prev ? { ...prev, is_read: true } : null)
        setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, is_read: true } : e))
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  // Bulk actions
  function toggleCheck(id: string, checked: boolean) {
    setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n })
  }
  function clearSelection() { setSelectedIds(new Set()) }

  async function bulkBin() {
    const ids = [...selectedIds]
    const targets = emails.filter(e => selectedIds.has(e.id))
    await Promise.all(targets.map(e => nylasMove(e, 'TRASH')))
    await supabase.from('email_messages').update({ folder: 'bin', is_starred: false }).in('id', ids)
    setEmails(prev => prev.filter(e => !selectedIds.has(e.id)))
    clearSelection()
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} moved to bin`)
  }
  async function bulkMarkRead() {
    const ids = [...selectedIds]
    await supabase.from('email_messages').update({ is_read: true }).in('id', ids)
    setEmails(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, is_read: true } : e))
    clearSelection()
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} marked as read`)
  }
  async function bulkSpam() {
    const ids = [...selectedIds]
    const targets = emails.filter(e => selectedIds.has(e.id))
    await Promise.all(targets.map(e => nylasMove(e, 'SPAM')))
    await supabase.from('email_messages').update({ folder: 'spam' }).in('id', ids)
    setEmails(prev => prev.filter(e => !selectedIds.has(e.id)))
    clearSelection()
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} moved to spam`)
  }

  async function handleStar(email: EmailMessage) {
    const next = !email.is_starred
    await supabase.from('email_messages').update({ is_starred: next }).eq('id', email.id)
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_starred: next } : e))
    if (selected?.id === email.id) setSelected(prev => prev ? { ...prev, is_starred: next } : null)
  }

  // Client-side search filter
  const filtered = emails.filter(e =>
    !search ||
    e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.sender_email?.toLowerCase().includes(search.toLowerCase())
  )

  function startListDrag(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = listWidth
    function onMove(ev: MouseEvent) {
      const newWidth = Math.max(240, Math.min(600, startW + ev.clientX - startX))
      setListWidth(newWidth)
      try { localStorage.setItem(LIST_WIDTH_KEY, String(newWidth)) } catch { /* ignore */ }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <EmailList
        emails={filtered}
        selected={selected}
        style={{ width: listWidth, flexShrink: 0 }}
        selectedIds={selectedIds}
        loading={loading}
        filter={filter}
        search={search}
        onSelect={setSelected}
        onCheck={toggleCheck}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onBulkRead={bulkMarkRead}
        onBulkSpam={bulkSpam}
        onBulkBin={bulkBin}
        onClearSelection={clearSelection}
        onStar={handleStar}
      />

      <div className="es-drag-handle" onMouseDown={startListDrag} />

      {selected ? (
        <EmailDetail
          email={selected}
          onClose={() => setSelected(null)}
          onAction={() => { load() }}
        />
      ) : (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--es-n-25)', gap: 8, color: 'var(--es-n-300)',
        }}>
          <Mail size={32} />
          <span style={{ fontSize: 13, color: 'var(--es-n-400)' }}>Select an email to read</span>
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--es-n-150)', borderTopColor: 'var(--es-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <InboxContent />
    </Suspense>
  )
}
