'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EmailMessage } from '@/lib/types'
import { formatDate, extractTextPreview } from '@/lib/utils'
import { Mail, Star, Paperclip, X, AlertOctagon, Trash2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import MailBodyRenderer from '@/components/email/MailBodyRenderer'

export type Folder = 'sent' | 'starred' | 'spam' | 'bin' | 'drafts'

const FOLDER_LABELS: Record<Folder, string> = {
  sent:    'Sent',
  starred: 'Starred',
  spam:    'Spam',
  bin:     'Bin',
  drafts:  'Drafts',
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-start gap-3 animate-pulse">
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="flex justify-between">
              <div className="h-3 w-36 bg-gray-200 rounded" />
              <div className="h-3 w-10 bg-gray-100 rounded" />
            </div>
            <div className="h-3 w-52 bg-gray-200 rounded" />
            <div className="h-2.5 w-full bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmailFolderView({ folder }: { folder: Folder }) {
  const [emails,   setEmails]   = useState<EmailMessage[]>([])
  const [selected, setSelected] = useState<EmailMessage | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function load() {
    setLoading(true)
    let query = supabase.from('email_messages').select('*').order('created_at', { ascending: false })
    if (folder === 'starred') {
      query = query.eq('is_starred', true)
    } else {
      query = query.eq('folder', folder)
    }
    const { data } = await query
    setEmails((data || []) as EmailMessage[])
    setLoading(false)
  }

  useEffect(() => { load() }, [folder]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────────────────────

  async function toggleStar(email: EmailMessage) {
    await supabase.from('email_messages').update({ is_starred: !email.is_starred }).eq('id', email.id)
    setSelected(prev => prev?.id === email.id ? { ...prev, is_starred: !prev.is_starred } : prev)
    load()
  }

  async function moveTo(email: EmailMessage, dest: string) {
    await supabase.from('email_messages').update({ folder: dest }).eq('id', email.id)
    toast.success(dest === 'inbox' ? 'Restored to inbox' : `Moved to ${dest}`)
    setSelected(null)
    load()
  }

  async function deletePermanently(email: EmailMessage) {
    await supabase.from('email_messages').delete().eq('id', email.id)
    toast.success('Deleted permanently')
    setSelected(null)
    setConfirmDelete(false)
    load()
  }

  // ── List item ──────────────────────────────────────────────────────────────

  function ListItem({ email }: { email: EmailMessage }) {
    const isSelected = selected?.id === email.id
    const preview    = extractTextPreview(email.body_preview || email.body_text)
    const sender     = folder === 'sent' ? email.recipient_email : email.sender_email

    return (
      <button
        onClick={() => setSelected(email)}
        className={cn(
          'w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors',
          isSelected && 'bg-blue-50 border-l-[3px] border-l-blue-500'
        )}
      >
        <div className="flex justify-between items-start gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{sender || '—'}</span>
          <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{formatDate(email.created_at)}</span>
        </div>
        <p className="text-xs text-gray-600 truncate mt-0.5">{email.subject || '(no subject)'}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{preview}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {email.is_starred && <Star size={10} className="text-amber-400 fill-amber-400" />}
          {email.has_attachments && <Paperclip size={10} className="text-gray-300" />}
        </div>
      </button>
    )
  }

  // ── Detail action bar ──────────────────────────────────────────────────────

  function ActionBar({ email }: { email: EmailMessage }) {
    return (
      <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-1.5 flex-wrap">

        {/* Star — all folders */}
        <button
          onClick={() => toggleStar(email)}
          className={cn(
            'flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors',
            email.is_starred
              ? 'border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          <Star size={12} fill={email.is_starred ? 'currentColor' : 'none'} />
          {email.is_starred ? 'Starred' : 'Star'}
        </button>

        {/* Inbox / Starred / Sent: move to spam + bin */}
        {(folder === 'starred' || folder === 'sent') && (
          <>
            <button
              onClick={() => moveTo(email, 'bin')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 size={12} /> Bin
            </button>
          </>
        )}

        {/* Spam folder: restore + bin */}
        {folder === 'spam' && (
          <>
            <button
              onClick={() => moveTo(email, 'inbox')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <RotateCcw size={12} /> Not spam
            </button>
            <button
              onClick={() => moveTo(email, 'bin')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 size={12} /> Bin
            </button>
          </>
        )}

        {/* Bin folder: restore + permanent delete */}
        {folder === 'bin' && (
          <>
            <button
              onClick={() => moveTo(email, 'inbox')}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <RotateCcw size={12} /> Restore
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-red-600">Delete forever?</span>
                <button
                  onClick={() => deletePermanently(email)}
                  className="text-xs bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs border border-red-200 text-red-500 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors ml-auto"
              >
                <Trash2 size={12} /> Delete forever
              </button>
            )}
          </>
        )}

        {/* Drafts: mark spam */}
        {folder === 'drafts' && (
          <button
            onClick={() => moveTo(email, 'spam')}
            className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <AlertOctagon size={12} /> Spam
          </button>
        )}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">

      {/* Email list */}
      <div className={cn('flex flex-col border-r border-gray-200 bg-white', selected ? 'w-80 flex-shrink-0' : 'flex-1')}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{FOLDER_LABELS[folder]}</h2>
          <span className="text-xs text-gray-400">{emails.length > 0 ? `${emails.length}` : ''}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <ListSkeleton />}
          {!loading && emails.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Mail size={28} className="mb-2 opacity-30" />
              <p className="text-sm">Nothing here</p>
            </div>
          )}
          {!loading && emails.map(email => (
            <ListItem key={email.id} email={email} />
          ))}
        </div>
      </div>

      {/* Detail pane */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
            <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">
              {selected.subject || '(no subject)'}
            </h3>
            <button
              onClick={() => { setSelected(null); setConfirmDelete(false) }}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Metadata */}
          <div className="px-5 py-3 border-b border-gray-100 space-y-1.5 text-xs">
            <div className="flex items-baseline gap-3">
              <span className="text-gray-400 w-8 flex-shrink-0">From</span>
              <span className="text-gray-700">{selected.sender_email || '—'}</span>
            </div>
            {selected.recipient_email && (
              <div className="flex items-baseline gap-3">
                <span className="text-gray-400 w-8 flex-shrink-0">To</span>
                <span className="text-gray-700">{selected.recipient_email}</span>
              </div>
            )}
            {selected.cc?.length ? (
              <div className="flex items-baseline gap-3">
                <span className="text-gray-400 w-8 flex-shrink-0">CC</span>
                <span className="text-gray-700">{selected.cc.join(', ')}</span>
              </div>
            ) : null}
            <div className="flex items-baseline gap-3">
              <span className="text-gray-400 w-8 flex-shrink-0">Date</span>
              <span className="text-gray-700">{new Date(selected.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {selected.has_attachments && (
              <div className="flex items-center gap-1.5 text-gray-500 pt-0.5">
                <Paperclip size={11} /> Has attachments
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <MailBodyRenderer body={selected.body_text} preview={selected.body_preview} />
          </div>

          {/* Action bar */}
          <ActionBar email={selected} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50/50">
          <div className="text-center">
            <Mail size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Select an email to read</p>
          </div>
        </div>
      )}
    </div>
  )
}
