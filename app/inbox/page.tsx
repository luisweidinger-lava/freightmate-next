'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { EmailMessage } from '@/lib/types'
import { formatDate, formatRef } from '@/lib/utils'
import {
  Mail, Star, AlertTriangle, Paperclip, ChevronRight,
  Search, Filter, Link2, Plus, Trash2, AlertOctagon,
  CheckCircle2, X, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Email row ────────────────────────────────────────────────────────────────

function EmailRow({
  email, selected, onClick,
}: {
  email: EmailMessage; selected: boolean; onClick: () => void
}) {
  const isUnmatched = !email.case_id
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-3',
        selected && 'bg-blue-50 border-l-2 border-l-blue-500',
        !email.is_read && 'bg-white',
        email.is_read && 'bg-gray-50/50',
      )}
    >
      {/* Unread dot */}
      <div className="mt-1.5 flex-shrink-0">
        {!email.is_read
          ? <span className="w-2 h-2 rounded-full bg-blue-500 block" />
          : <span className="w-2 h-2 rounded-full bg-transparent block" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', !email.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700')}>
            {email.sender_email || '(unknown)'}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(email.created_at)}</span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {isUnmatched ? (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
              <AlertTriangle size={10} /> No Ref
            </span>
          ) : (
            <span className="text-xs text-blue-600 font-medium">
              {formatRef(null)}
            </span>
          )}
          <span className={cn('text-sm truncate', !email.is_read ? 'text-gray-800' : 'text-gray-500')}>
            {email.subject || '(no subject)'}
          </span>
        </div>

        <p className="text-xs text-gray-400 truncate mt-0.5">{email.body_preview || ''}</p>
      </div>

      <div className="flex-shrink-0 flex flex-col items-end gap-1.5 mt-0.5">
        {email.is_starred && <Star size={12} className="text-amber-400 fill-amber-400" />}
        {email.has_attachments && <Paperclip size={12} className="text-gray-400" />}
      </div>
    </button>
  )
}

// ─── Triage panel for unmatched emails ───────────────────────────────────────

function TriagePanel({ email, onDone }: { email: EmailMessage; onDone: () => void }) {
  const [refInput, setRefInput] = useState('')
  const [linking, setLinking]   = useState(false)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  async function linkToCase() {
    if (!refInput.trim()) return
    setLinking(true)
    // Look up case by ref_number
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

    // Update email to link to case
    await supabase
      .from('email_messages')
      .update({ case_id: caseData.id, is_processed: true })
      .eq('id', email.id)

    toast.success(`Email linked to ${formatRef(caseData.ref_number)}`)
    setLinking(false)
    onDone()
  }

  async function createCase() {
    if (!refInput.trim()) return
    setCreating(true)
    const { data: newCase, error } = await supabase
      .from('shipment_cases')
      .insert({
        ref_number:   refInput.trim(),
        client_email: email.sender_email || '',
        status:       'new',
      })
      .select()
      .single()

    if (error || !newCase) {
      toast.error('Could not create case — check the Ref number is unique')
      setCreating(false)
      return
    }

    await supabase
      .from('email_messages')
      .update({ case_id: newCase.id, is_processed: true })
      .eq('id', email.id)

    toast.success(`Case created: ${formatRef(refInput.trim())}`)
    setCreating(false)
    onDone()
    router.push(`/cases/${refInput.trim()}`)
  }

  async function moveToSpam() {
    await supabase.from('email_messages').update({ folder: 'spam' }).eq('id', email.id)
    toast.success('Moved to spam')
    onDone()
  }

  async function moveToBin() {
    await supabase.from('email_messages').update({ folder: 'bin' }).eq('id', email.id)
    toast.success('Moved to bin')
    onDone()
  }

  return (
    <div className="border-t border-amber-200 bg-amber-50/40 p-5 space-y-4">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertTriangle size={15} className="text-amber-500" />
        <span className="text-sm font-semibold">Unmatched Email — Action Required</span>
      </div>

      {/* Link to existing */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Link2 size={13} /> Link to existing case
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Ref number (e.g. 123456)"
            value={refInput}
            onChange={e => setRefInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && linkToCase()}
            className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
          <button
            onClick={linkToCase}
            disabled={linking || !refInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {linking ? 'Linking…' : 'Link'}
          </button>
        </div>
      </div>

      {/* Create new */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Plus size={13} /> Create new case with Ref from offline system
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New Ref number from offline system"
            value={refInput}
            onChange={e => setRefInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createCase()}
            className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
          />
          <button
            onClick={createCase}
            disabled={creating || !refInput.trim()}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>

      {/* Dismiss actions */}
      <div className="flex gap-2">
        <button
          onClick={moveToSpam}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <AlertOctagon size={12} /> Mark as Spam
        </button>
        <button
          onClick={moveToBin}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-700 border border-gray-200 rounded-md px-3 py-2 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={12} /> Move to Bin
        </button>
      </div>
    </div>
  )
}

// ─── Email detail pane ────────────────────────────────────────────────────────

function EmailDetail({
  email, onClose, onAction,
}: {
  email: EmailMessage; onClose: () => void; onAction: () => void
}) {
  const router = useRouter()

  async function toggleStar() {
    await supabase.from('email_messages').update({ is_starred: !email.is_starred }).eq('id', email.id)
    onAction()
  }

  async function markSpam() {
    await supabase.from('email_messages').update({ folder: 'spam' }).eq('id', email.id)
    toast.success('Moved to spam')
    onAction()
    onClose()
  }

  async function moveToBin() {
    await supabase.from('email_messages').update({ folder: 'bin' }).eq('id', email.id)
    toast.success('Moved to bin')
    onAction()
    onClose()
  }

  const isUnmatched = !email.case_id

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">
          {email.subject || '(no subject)'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Meta */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">From</span>
            <span className="text-gray-800 font-medium">{email.sender_email}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">To</span>
            <span className="text-gray-800">{email.recipient_email}</span>
          </div>
          {email.cc && email.cc.length > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">CC</span>
              <span className="text-gray-800">{email.cc.join(', ')}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Date</span>
            <span className="text-gray-800">{new Date(email.created_at).toLocaleString('en-GB')}</span>
          </div>

          {/* Case link */}
          {email.case_id ? (
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-500">Case</span>
              <button
                onClick={() => router.push(`/cases/${email.case_id}`)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                Open Workbench <ExternalLink size={10} />
              </button>
            </div>
          ) : (
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-500">Case</span>
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle size={11} /> Unmatched
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {email.body_text || email.body_preview || '(no content)'}
          </p>
        </div>

        {/* Triage (unmatched only) */}
        {isUnmatched && <TriagePanel email={email} onDone={onAction} />}
      </div>

      {/* Action bar */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={toggleStar}
          className={cn(
            'flex items-center gap-1.5 text-xs border rounded-md px-3 py-2 transition-colors',
            email.is_starred
              ? 'border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          <Star size={12} fill={email.is_starred ? 'currentColor' : 'none'} />
          {email.is_starred ? 'Starred' : 'Star'}
        </button>
        <button
          onClick={markSpam}
          className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <AlertOctagon size={12} /> Spam
        </button>
        <button
          onClick={moveToBin}
          className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-md px-3 py-2 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 size={12} /> Bin
        </button>
      </div>
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
    filterParam === 'unmatched' ? 'unmatched' : 'all'
  )
  const [loading, setLoading]   = useState(true)

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
    setEmails(data || [])

    // Auto-select if id in URL
    if (idParam && data) {
      const found = data.find(e => e.id === idParam)
      if (found) setSelected(found)
    }

    setLoading(false)
  }, [filter, idParam])

  useEffect(() => { load() }, [load])

  // Mark as read when selected
  useEffect(() => {
    if (selected && !selected.is_read) {
      supabase.from('email_messages').update({ is_read: true }).eq('id', selected.id)
    }
  }, [selected])

  const filtered = emails.filter(e =>
    !search ||
    e.subject?.toLowerCase().includes(search.toLowerCase()) ||
    e.sender_email?.toLowerCase().includes(search.toLowerCase())
  )

  const unmatchedCount = emails.filter(e => !e.case_id).length

  return (
    <div className="flex h-full">
      {/* Email list */}
      <div className={cn('flex flex-col border-r border-gray-200 bg-white', selected ? 'w-80 flex-shrink-0' : 'flex-1')}>

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Inbox</h2>
            {unmatchedCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {unmatchedCount} unmatched
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {(['all', 'unread', 'unmatched'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors capitalize',
                  filter === f
                    ? f === 'unmatched'
                      ? 'bg-amber-100 text-amber-700 font-medium'
                      : 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Mail size={32} className="mb-2" />
              <p className="text-sm">No emails</p>
            </div>
          )}
          {filtered.map(email => (
            <EmailRow
              key={email.id}
              email={email}
              selected={selected?.id === email.id}
              onClick={() => setSelected(email)}
            />
          ))}
        </div>
      </div>

      {/* Detail pane */}
      {selected && (
        <div className="flex-1 overflow-hidden">
          <EmailDetail
            email={selected}
            onClose={() => setSelected(null)}
            onAction={load}
          />
        </div>
      )}

      {!selected && (
        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center">
            <Mail size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select an email to read</p>
          </div>
        </div>
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
