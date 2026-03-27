'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EmailMessage } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Mail, Star, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Folder = 'sent' | 'starred' | 'spam' | 'bin' | 'drafts'

const FOLDER_LABELS: Record<Folder, string> = {
  sent:   'Sent',
  starred:'Starred',
  spam:   'Spam',
  bin:    'Bin',
  drafts: 'Drafts',
}

export default function EmailFolderView({ folder }: { folder: Folder }) {
  const [emails, setEmails]     = useState<EmailMessage[]>([])
  const [selected, setSelected] = useState<EmailMessage | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase.from('email_messages').select('*').order('created_at', { ascending: false })

      if (folder === 'starred') {
        query = query.eq('is_starred', true)
      } else {
        query = query.eq('folder', folder)
      }

      const { data } = await query
      setEmails(data || [])
      setLoading(false)
    }
    load()
  }, [folder])

  return (
    <div className="flex h-full">
      <div className={cn('flex flex-col border-r border-gray-200 bg-white', selected ? 'w-80 flex-shrink-0' : 'flex-1')}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{FOLDER_LABELS[folder]}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          {!loading && emails.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Mail size={32} className="mb-2" />
              <p className="text-sm">Nothing here</p>
            </div>
          )}
          {emails.map(email => (
            <button
              key={email.id}
              onClick={() => setSelected(email)}
              className={cn(
                'w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                selected?.id === email.id && 'bg-blue-50 border-l-2 border-l-blue-500'
              )}
            >
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-800 truncate">{email.sender_email || email.recipient_email}</span>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDate(email.created_at)}</span>
              </div>
              <p className="text-sm text-gray-600 truncate mt-0.5">{email.subject}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{email.body_preview}</p>
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{selected.subject}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-2">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-4 border-b border-gray-100 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">From</span>
              <span className="text-gray-800">{selected.sender_email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-800">{new Date(selected.created_at).toLocaleString('en-GB')}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {selected.body_text || selected.body_preview || '(no content)'}
            </p>
          </div>
        </div>
      ) : (
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
