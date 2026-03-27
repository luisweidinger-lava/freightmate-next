'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Contact, PERSONA_COLORS } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, AlertCircle, CheckCircle2,
  Edit2, Trash2, X, Save, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const PERSONAS = ['vendor', 'client', 'coordinator', 'internal', 'general'] as const
type PersonaType = typeof PERSONAS[number]

const PERSONA_LABELS: Record<PersonaType, string> = {
  vendor:      'Vendor / Freight Partner',
  client:      'Client / Shipper',
  coordinator: 'Coordinator',
  internal:    'Internal',
  general:     'General / Info',
}

// ─── Contact detail / edit pane ───────────────────────────────────────────────

function ContactPane({
  contact, onSave, onDelete, onClose,
}: {
  contact: Contact | null
  onSave:   (c: Partial<Contact> & { email: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose:  () => void
}) {
  const [editing, setEditing] = useState(!contact)
  const [form, setForm] = useState<Partial<Contact>>(contact || {
    email: '', display_name: '', persona: 'client',
    company_name: '', company_domain: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(contact || { email: '', display_name: '', persona: 'client', company_name: '', company_domain: '', notes: '' })
    setEditing(!contact)
  }, [contact])

  async function handleSave() {
    if (!form.email) { toast.error('Email is required'); return }
    setSaving(true)
    await onSave(form as Partial<Contact> & { email: string })
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!contact) return
    if (!confirm(`Delete ${contact.email}?`)) return
    await onDelete(contact.id)
  }

  async function markValidated() {
    if (!contact) return
    await supabase.from('contacts').update({ needs_review: false, is_validated: true }).eq('id', contact.id)
    toast.success('Marked as validated')
    onClose()
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {contact ? contact.display_name || contact.email : 'New Contact'}
        </h3>
        <div className="flex items-center gap-2">
          {contact && !editing && (
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600">
              <Edit2 size={15} />
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Needs review banner */}
      {contact?.needs_review && (
        <div className="mx-4 mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          <AlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">Needs Review</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This contact was auto-created from an unrecognised email. Please verify the persona and details.
            </p>
          </div>
          <button
            onClick={markValidated}
            className="text-xs bg-amber-500 text-white px-2.5 py-1 rounded-md hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            Validate
          </button>
        </div>
      )}

      {/* Form / View */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Persona */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Persona</label>
          {editing ? (
            <select
              value={form.persona}
              onChange={e => setForm(f => ({ ...f, persona: e.target.value as PersonaType }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {PERSONAS.map(p => (
                <option key={p} value={p}>{PERSONA_LABELS[p]}</option>
              ))}
            </select>
          ) : (
            <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PERSONA_COLORS[contact?.persona || 'general'])}>
              {PERSONA_LABELS[contact?.persona as PersonaType || 'general']}
            </span>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Email Address</label>
          {editing ? (
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <p className="text-sm text-gray-800">{contact?.email}</p>
          )}
        </div>

        {/* Display name */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Display Name</label>
          {editing ? (
            <input
              type="text"
              value={form.display_name || ''}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="John Smith"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <p className="text-sm text-gray-800">{contact?.display_name || '—'}</p>
          )}
        </div>

        {/* Company */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Company</label>
          {editing ? (
            <input
              type="text"
              value={form.company_name || ''}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder="FreightMate Ltd."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <p className="text-sm text-gray-800">{contact?.company_name || '—'}</p>
          )}
        </div>

        {/* Domain */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Company Domain</label>
          {editing ? (
            <input
              type="text"
              value={form.company_domain || ''}
              onChange={e => setForm(f => ({ ...f, company_domain: e.target.value }))}
              placeholder="freightmate.com"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          ) : (
            <p className="text-sm text-gray-800">{contact?.company_domain || '—'}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Notes</label>
          {editing ? (
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-800">{contact?.notes || '—'}</p>
          )}
        </div>

        {contact && !editing && (
          <div className="text-xs text-gray-400 pt-2">
            Added {formatDate(contact.created_at)}
            {contact.is_validated && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <CheckCircle2 size={11} /> Validated
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {editing && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          {contact && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {contact && (
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save size={12} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CRM Page ─────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [selected, setSelected]   = useState<Contact | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [search, setSearch]       = useState('')
  const [personaFilter, setPersonaFilter] = useState<string>('all')
  const [loading, setLoading]     = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .order('needs_review', { ascending: false })
      .order('company_name', { ascending: true })
    setContacts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(form: Partial<Contact> & { email: string }) {
    if (selected) {
      const { error } = await supabase.from('contacts').update(form).eq('id', selected.id)
      if (error) { toast.error(error.message); return }
      toast.success('Contact updated')
    } else {
      const { error } = await supabase.from('contacts').insert({ ...form, is_validated: true, needs_review: false })
      if (error) { toast.error(error.message); return }
      toast.success('Contact added')
    }
    setSelected(null)
    setAddingNew(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    toast.success('Contact deleted')
    setSelected(null)
    load()
  }

  const needsReview = contacts.filter(c => c.needs_review)

  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchPersona = personaFilter === 'all' || c.persona === personaFilter
    return matchSearch && matchPersona
  })

  // Group by company domain
  const grouped: Record<string, Contact[]> = {}
  filtered.forEach(c => {
    const key = c.company_name || c.company_domain || c.email
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(c)
  })

  const showPane = selected || addingNew

  return (
    <div className="flex h-full">
      {/* List */}
      <div className={cn('flex flex-col bg-white border-r border-gray-200', showPane ? 'w-96 flex-shrink-0' : 'flex-1')}>
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">CRM &amp; Contacts</h2>
            <button
              onClick={() => { setSelected(null); setAddingNew(true) }}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={13} /> Add contact
            </button>
          </div>

          {/* Needs review alert */}
          {needsReview.length > 0 && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>{needsReview.length} contact{needsReview.length > 1 ? 's' : ''}</strong> need manual review
              </p>
            </div>
          )}

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {['all', ...PERSONAS].map(p => (
              <button
                key={p}
                onClick={() => setPersonaFilter(p)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-md transition-colors capitalize',
                  personaFilter === p
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && Object.keys(grouped).length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No contacts found</p>
              <button
                onClick={() => { setSelected(null); setAddingNew(true) }}
                className="text-xs text-blue-600 mt-2 hover:underline"
              >
                Add your first contact
              </button>
            </div>
          )}

          {Object.entries(grouped).map(([group, groupContacts]) => (
            <div key={group}>
              <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500">{group}</p>
              </div>
              {groupContacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => { setSelected(contact); setAddingNew(false) }}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-3',
                    selected?.id === contact.id && 'bg-blue-50 border-l-2 border-l-blue-500'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                    PERSONA_COLORS[contact.persona]
                  )}>
                    {(contact.display_name || contact.email)[0]?.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {contact.display_name || contact.email}
                      </span>
                      {contact.needs_review && (
                        <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                  </div>

                  <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">{contacts.length} contacts total</p>
        </div>
      </div>

      {/* Detail pane */}
      {showPane && (
        <div className="flex-1 overflow-hidden">
          <ContactPane
            contact={addingNew ? null : selected}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => { setSelected(null); setAddingNew(false) }}
          />
        </div>
      )}

      {!showPane && (
        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
          <div className="text-center">
            <p className="text-sm">Select a contact to view details</p>
            <button
              onClick={() => setAddingNew(true)}
              className="text-xs text-blue-600 mt-2 hover:underline"
            >
              or add a new one
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
