'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EmailMessage } from '@/lib/types'
import { formatDate, formatRef, extractTextPreview } from '@/lib/utils'
import {
  Mail, Star, AlertTriangle, Paperclip, Briefcase,
  Search, Link2, Plus, Trash2, AlertOctagon, X,
  Reply, ReplyAll, Forward, Edit3, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import MailBodyRenderer from '@/components/email/MailBodyRenderer'
import ComposePanel, { ComposeMode } from '@/components/email/ComposePanel'

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function MailListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-start gap-3 animate-pulse">
          <div className="mt-1.5 w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-10 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-48 bg-gray-200 rounded" />
            <div className="h-2.5 w-full bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MailDetailSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-4">
      <div className="h-5 w-2/3 bg-gray-200 rounded" />
      <div className="space-y-2 border-b border-gray-100 pb-4">
        {[40, 48, 56].map(w => (
          <div key={w} className="flex justify-between">
            <div className="h-3 w-8 bg-gray-100 rounded" />
            <div className={`h-3 bg-gray-200 rounded`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-2">
        {[100, 90, 95, 70, 85].map((w, i) => (
          <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Mail list item ───────────────────────────────────────────────────────────

function MailListItem({
  email, selected, checked, onCheck, onClick,
}: {
  email: EmailMessage; selected: boolean; checked: boolean
  onCheck: (id: string, checked: boolean) => void; onClick: () => void
}) {
  const isUnmatched = !email.case_id
  const senderLabel = email.sender_email || '(unknown sender)'

  return (
    <div
      className={cn(
        'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50/80 transition-colors flex items-start gap-3 group',
        selected && 'bg-violet-50/80 border-l-[3px] border-l-violet-500',
        checked && 'bg-violet-50/40',
      )}
    >
      {/* Checkbox / unread dot */}
      <div className="mt-[5px] flex-shrink-0 w-4 flex items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => { e.stopPropagation(); onCheck(email.id, e.target.checked) }}
          onClick={e => e.stopPropagation()}
          className={cn(
            'w-3 h-3 rounded cursor-pointer accent-blue-600',
            !checked && 'opacity-0 group-hover:opacity-100 transition-opacity',
          )}
        />
        {!checked && !email.is_read && (
          <span className="w-2 h-2 rounded-full bg-violet-500 block absolute group-hover:hidden" />
        )}
      </div>

      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        {/* Row 1: sender + timestamp */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-sm truncate leading-tight',
            !email.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'
          )}>
            {senderLabel}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
            {formatDate(email.created_at)}
          </span>
        </div>

        {/* Row 2: subject */}
        <p className={cn(
          'text-xs truncate mt-0.5',
          !email.is_read ? 'text-gray-800 font-medium' : 'text-gray-500'
        )}>
          {email.subject || '(no subject)'}
        </p>

        {/* Row 3: preview + badges */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {isUnmatched && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
              <AlertTriangle size={9} /> Unmatched
            </span>
          )}
          <p className="text-xs text-gray-400 truncate">
            {extractTextPreview(email.body_preview || email.body_text)}
          </p>
        </div>
      </button>

      {/* Icons */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1 mt-0.5">
        {email.is_starred && <Star size={11} className="text-amber-400 fill-amber-400" />}
        {email.has_attachments && <Paperclip size={11} className="text-gray-300" />}
      </div>
    </div>
  )
}

// ─── Triage panel ─────────────────────────────────────────────────────────────

function TriagePanel({ email, onDone }: { email: EmailMessage; onDone: () => void }) {
  const [refInput, setRefInput] = useState('')
  const [linking, setLinking]   = useState(false)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  async function linkToCase() {
    if (!refInput.trim()) return
    setLinking(true)
    const { data: caseData } = await supabase
      .from('shipment_cases')
      .select('id, ref_number')
      .eq('ref_number', refInput.trim())
      .maybeSingle()

    if (!caseData) {
      toast.error(`No case found with Ref ${refInput.trim()}`)
      setLinking(false)
      return
    }
    await supabase.from('email_messages').update({ case_id: caseData.id, is_processed: true }).eq('id', email.id)
    toast.success(`Email linked to ${formatRef(caseData.ref_number)}`)
    setLinking(false)
    onDone()
  }

  async function createCase() {
    if (!refInput.trim()) return
    setCreating(true)
    const { data: newCase, error } = await supabase
      .from('shipment_cases')
      .insert({ ref_number: refInput.trim(), client_email: email.sender_email || '', status: 'new' })
      .select()
      .single()

    if (error || !newCase) {
      toast.error('Could not create case — check the Ref is unique')
      setCreating(false)
      return
    }
    await supabase.from('email_messages').update({ case_id: newCase.id, is_processed: true }).eq('id', email.id)
    toast.success(`Case created: ${formatRef(refInput.trim())}`)
    setCreating(false)
    onDone()
    router.push(`/cases/${refInput.trim()}`)
  }

  return (
    <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4 space-y-3">
      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
        <AlertTriangle size={13} className="text-slate-500" /> Triage required — email not linked to any case
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ref number (e.g. 354830)"
          value={refInput}
          onChange={e => setRefInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && linkToCase()}
          className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        />
        <button
          onClick={linkToCase}
          disabled={linking || !refInput.trim()}
          title="Link to existing case"
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          <Link2 size={11} /> {linking ? 'Linking…' : 'Link'}
        </button>
        <button
          onClick={createCase}
          disabled={creating || !refInput.trim()}
          title="Create new case"
          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <Plus size={11} /> {creating ? 'Creating…' : 'New case'}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => supabase.from('email_messages').update({ folder: 'spam' }).eq('id', email.id).then(onDone)}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <AlertOctagon size={11} /> Spam
        </button>
        <button
          onClick={() => supabase.from('email_messages').update({ folder: 'bin' }).eq('id', email.id).then(onDone)}
          className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-red-50 transition-colors flex items-center gap-1"
        >
          <Trash2 size={11} /> Bin
        </button>
      </div>
    </div>
  )
}

// ─── Email detail pane ────────────────────────────────────────────────────────

function MailDetail({
  email, onClose, onAction,
}: {
  email: EmailMessage; onClose: () => void; onAction: () => void
}) {
  const router = useRouter()
  const [compose, setCompose] = useState<{ mode: ComposeMode } | null>(null)

  async function toggleStar() {
    await supabase.from('email_messages').update({ is_starred: !email.is_starred }).eq('id', email.id)
    onAction()
  }
  async function markSpam() {
    await supabase.from('email_messages').update({ folder: 'spam' }).eq('id', email.id)
    toast.success('Moved to spam')
    onAction(); onClose()
  }
  async function moveToBin() {
    await supabase.from('email_messages').update({ folder: 'bin', is_starred: false }).eq('id', email.id)
    toast.success('Moved to bin')
    onAction(); onClose()
  }

  const isUnmatched = !email.case_id

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Subject header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 gap-3">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug flex-1">
          {email.subject || '(no subject)'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Metadata + case action */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-2.5">
          {/* From / To / CC */}
          <div className="space-y-1.5">
            {[
              { label: 'From', value: email.sender_email },
              { label: 'To',   value: email.recipient_email },
              ...(email.cc?.length ? [{ label: 'CC', value: email.cc.join(', ') }] : []),
              { label: 'Date', value: new Date(email.created_at).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline gap-3 text-xs">
                <span className="text-gray-400 w-8 flex-shrink-0">{label}</span>
                <span className="text-gray-700 min-w-0 break-all">{value}</span>
              </div>
            ))}
          </div>

          {/* Case action bar */}
          {email.case_id ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-teal-700 font-medium">Linked to case</span>
              </div>
              <button
                onClick={() => router.push(`/cases/${email.case_id}`)}
                className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 font-semibold transition-colors"
              >
                <Briefcase size={12} />
                Open in Workbench
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="text-slate-500 flex-shrink-0" />
              <span className="text-xs text-slate-700 font-medium">Unmatched — not linked to any case</span>
            </div>
          )}

          {/* Attachment indicator */}
          {email.has_attachments && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Paperclip size={12} /> Has attachments
            </div>
          )}
        </div>

        {/* Email body */}
        <div className="px-6 py-5">
          <MailBodyRenderer body={email.body_text} preview={email.body_preview} />
        </div>

        {/* Triage panel (unmatched only) */}
        {isUnmatched && <TriagePanel email={email} onDone={onAction} />}
      </div>

      {/* Bottom action bar */}
      <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-1.5 bg-white flex-wrap">
        <button
          onClick={() => setCompose({ mode: 'reply' })}
          className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors font-medium"
        >
          <Reply size={12} /> Reply
        </button>
        <button
          onClick={() => setCompose({ mode: 'replyAll' })}
          className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <ReplyAll size={12} /> Reply all
        </button>
        <button
          onClick={() => setCompose({ mode: 'forward' })}
          className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Forward size={12} /> Forward
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          onClick={toggleStar}
          className={cn(
            'flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors',
            email.is_starred
              ? 'border-slate-300 text-slate-600 bg-slate-50 hover:bg-slate-100'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          <Star size={12} fill={email.is_starred ? 'currentColor' : 'none'} />
          {email.is_starred ? 'Starred' : 'Star'}
        </button>
        <button
          onClick={markSpam}
          className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <AlertOctagon size={12} /> Spam
        </button>
        <button
          onClick={moveToBin}
          className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 size={12} /> Bin
        </button>
      </div>

      {compose && (
        <ComposePanel
          mode={compose.mode}
          replyTo={email}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function InboxContent() {
  const searchParams = useSearchParams()
  const filterParam  = searchParams.get('filter')
  const idParam      = searchParams.get('id')

  const [emails, setEmails]     = useState<EmailMessage[]>([])
  const [selected, setSelected] = useState<EmailMessage | null>(null)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'all' | 'unread' | 'unmatched'>(
    filterParam === 'unmatched' ? 'unmatched' : filterParam === 'unread' ? 'unread' : 'all'
  )
  const [loading, setLoading]   = useState(true)

  // Sync filter state when URL param changes (e.g. sidebar "Unmatched" link while already on /inbox)
  useEffect(() => {
    if (filterParam === 'unmatched') setFilter('unmatched')
    else if (filterParam === 'unread') setFilter('unread')
    else setFilter('all')
  }, [filterParam])
  const [syncing, setSyncing]       = useState(false)
  const [compose, setCompose]       = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('email_messages')
      .select('*')
      .eq('folder', 'inbox')
      .order('created_at', { ascending: false })

    if (filter === 'unread')    query = query.eq('is_read', false)
    if (filter === 'unmatched') query = query.is('case_id', null)

    const { data } = await query
    const emails = (data || []) as EmailMessage[]
    setEmails(emails)

    if (idParam) {
      const found = emails.find(e => e.id === idParam)
      if (found) setSelected(found)
    }
    setLoading(false)
  }, [filter, idParam])

  useEffect(() => { load() }, [load])

  // Realtime — auto-refresh inbox when any email changes (sync, read, star, move, delete)
  useEffect(() => {
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_messages' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/nylas-sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Sync complete — ${data.upserted ?? data.synced} new or updated messages`)
        load()
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } finally {
      setSyncing(false)
    }
  }


  // Bulk actions
  function toggleCheck(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }
  function clearSelection() { setSelectedIds(new Set()) }

  async function bulkBin() {
    const ids = [...selectedIds]
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
    await supabase.from('email_messages').update({ folder: 'spam' }).in('id', ids)
    setEmails(prev => prev.filter(e => !selectedIds.has(e.id)))
    clearSelection()
    toast.success(`${ids.length} email${ids.length > 1 ? 's' : ''} moved to spam`)
  }

  // Mark as read when selected
  useEffect(() => {
    if (selected && !selected.is_read) {
      supabase.from('email_messages').update({ is_read: true }).eq('id', selected.id)
      setSelected(prev => prev ? { ...prev, is_read: true } : null)
      setEmails(prev => prev.map(e => e.id === selected.id ? { ...e, is_read: true } : e))
    }
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = emails.filter(e =>
    !search ||
    e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.sender_email?.toLowerCase().includes(search.toLowerCase())
  )

  const unmatchedCount = emails.filter(e => !e.case_id).length

  return (
    <div className="flex h-full">

      {/* ── Email list ───────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex flex-col border-r border-gray-200 bg-white',
        selected ? 'w-80 flex-shrink-0' : 'flex-1'
      )}>
        {/* Toolbar */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Inbox</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                title="Sync from Gmail"
                className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
              <button
                onClick={() => setCompose(true)}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-violet-700 transition-colors font-medium"
              >
                <Edit3 size={11} /> Compose
              </button>
            {unmatchedCount > 0 && (
              <button
                onClick={() => setFilter('unmatched')}
                className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium hover:bg-slate-200 transition-colors"
              >
                {unmatchedCount} unmatched
              </button>
            )}
            </div>
          </div>

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search sender, subject…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <div className="flex gap-1">
            {(['all', 'unread', 'unmatched'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors capitalize',
                  filter === f
                    ? f === 'unmatched'
                      ? 'bg-slate-100 text-slate-700 font-medium'
                      : 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-blue-700 font-medium">{selectedIds.size} selected</span>
            <button onClick={bulkMarkRead} className="text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Mark read</button>
            <button onClick={bulkSpam} className="text-xs px-2 py-1 rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Spam</button>
            <button onClick={bulkBin} className="text-xs px-2 py-1 rounded bg-white border border-red-100 text-red-600 hover:bg-red-50 transition-colors">Bin</button>
            <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-600 ml-auto transition-colors">Clear</button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <MailListSkeleton />}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Mail size={28} className="mb-2 opacity-30" />
              <p className="text-sm">No emails</p>
            </div>
          )}
          {!loading && filtered.map(email => (
            <MailListItem
              key={email.id}
              email={email}
              selected={selected?.id === email.id}
              checked={selectedIds.has(email.id)}
              onCheck={toggleCheck}
              onClick={() => setSelected(email)}
            />
          ))}
        </div>
      </div>

      {/* ── Detail pane ──────────────────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 overflow-hidden">
          <MailDetail
            email={selected}
            onClose={() => setSelected(null)}
            onAction={() => { load(); setSelected(null) }}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/50">
          <div className="text-center">
            <Mail size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Select an email to read</p>
          </div>
        </div>
      )}

      {compose && (
        <ComposePanel mode="compose" onClose={() => setCompose(false)} />
      )}
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <InboxContent />
    </Suspense>
  )
}
