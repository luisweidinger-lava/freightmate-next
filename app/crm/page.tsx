'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Contact, Client, Vendor, PERSONA_COLORS } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, AlertCircle, CheckCircle2,
  Edit2, Trash2, X, Save, ChevronRight, UserPlus, Building2, Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Tab = 'contacts' | 'clients' | 'vendors'

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
  contact, onSave, onDelete, onClose, onPromote,
}: {
  contact: Contact | null
  onSave:    (c: Partial<Contact> & { email: string }) => Promise<void>
  onDelete:  (id: string) => Promise<void>
  onClose:   () => void
  onPromote: (contact: Contact, to: 'client' | 'vendor') => Promise<void>
}) {
  const [editing, setEditing] = useState(!contact)
  const [form, setForm] = useState<Partial<Contact>>(contact || {
    email: '', display_name: '', persona: 'client',
    company_name: '', company_domain: '', notes: '',
  })
  const [saving, setSaving]     = useState(false)
  const [promoting, setPromoting] = useState<'client' | 'vendor' | null>(null)

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

  async function handlePromote(to: 'client' | 'vendor') {
    if (!contact) return
    setPromoting(to)
    await onPromote(contact, to)
    setPromoting(null)
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
        <div className="mx-4 mt-4 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <AlertCircle size={15} className="text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700">Needs Review</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Auto-created from an unrecognised email. Please verify the persona and details.
            </p>
          </div>
          <button
            onClick={markValidated}
            className="text-xs bg-violet-600 text-white px-2.5 py-1 rounded-md hover:bg-violet-700 transition-colors flex-shrink-0"
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
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          ) : (
            <p className="text-sm text-gray-800">{contact?.email}</p>
          )}
        </div>

        {/* Display name */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Display Name</label>
          {editing ? (
            <input type="text" value={form.display_name || ''} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="John Smith"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          ) : (
            <p className="text-sm text-gray-800">{contact?.display_name || '—'}</p>
          )}
        </div>

        {/* Company */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Company</label>
          {editing ? (
            <input type="text" value={form.company_name || ''} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder="FreightMate Ltd."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          ) : (
            <p className="text-sm text-gray-800">{contact?.company_name || '—'}</p>
          )}
        </div>

        {/* Domain */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Company Domain</label>
          {editing ? (
            <input type="text" value={form.company_domain || ''} onChange={e => setForm(f => ({ ...f, company_domain: e.target.value }))}
              placeholder="freightmate.com"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          ) : (
            <p className="text-sm text-gray-800">{contact?.company_domain || '—'}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Notes</label>
          {editing ? (
            <textarea rows={3} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
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

        {/* Promote section */}
        {contact && !editing && (
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <p className="text-xs font-medium text-gray-500">Promote to</p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePromote('client')}
                disabled={promoting !== null}
                className="flex items-center gap-1.5 text-xs border border-blue-200 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                <Building2 size={12} />
                {promoting === 'client' ? 'Adding…' : 'Client'}
              </button>
              <button
                onClick={() => handlePromote('vendor')}
                disabled={promoting !== null}
                className="flex items-center gap-1.5 text-xs border border-slate-200 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <Truck size={12} />
                {promoting === 'vendor' ? 'Adding…' : 'Vendor'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {editing && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
          {contact && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors">
              <Trash2 size={12} /> Delete
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {contact && (
              <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">
                Cancel
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
              <Save size={12} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Client detail pane ───────────────────────────────────────────────────────

function ClientPane({ client, onClose, onDelete }: { client: Client; onClose: () => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{client.display_name || client.email}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
      </div>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        <Row label="Email"    value={client.email} />
        <Row label="Name"     value={client.display_name} />
        <Row label="Company"  value={client.company_name} />
        <Row label="Notes"    value={client.notes} />
        <Row label="Status"   value={client.is_active ? 'Active' : 'Inactive'} />
        <Row label="Added"    value={formatDate(client.created_at)} />
      </div>
      <div className="px-5 py-4 border-t border-gray-100">
        <button
          onClick={() => { if (confirm(`Remove client ${client.email}?`)) onDelete(client.id) }}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
        >
          <Trash2 size={12} /> Remove client
        </button>
      </div>
    </div>
  )
}

// ─── Vendor detail pane ───────────────────────────────────────────────────────

function VendorPane({ vendor, onClose, onDelete }: { vendor: Vendor; onClose: () => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{vendor.name || vendor.email}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
      </div>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        <Row label="Email"        value={vendor.email} />
        <Row label="Name"         value={vendor.name} />
        <Row label="Default mode" value={vendor.default_mode} />
        <Row label="Status"       value={vendor.is_active ? 'Active' : 'Inactive'} />
        <Row label="Added"        value={formatDate(vendor.created_at)} />
      </div>
      <div className="px-5 py-4 border-t border-gray-100">
        <button
          onClick={() => { if (confirm(`Remove vendor ${vendor.email}?`)) onDelete(vendor.id) }}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
        >
          <Trash2 size={12} /> Remove vendor
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )
}

// ─── CRM Page ─────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [tab, setTab] = useState<Tab>('contacts')

  // Contacts
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [selected, setSelected]   = useState<Contact | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [search, setSearch]       = useState('')
  const [personaFilter, setPersonaFilter] = useState<string>('all')
  const [contactsLoading, setContactsLoading] = useState(true)

  // Clients
  const [clients, setClients]         = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientsLoading, setClientsLoading] = useState(true)

  // Vendors
  const [vendors, setVendors]         = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [vendorsLoading, setVendorsLoading] = useState(true)

  async function loadContacts() {
    setContactsLoading(true)
    const { data } = await supabase.from('contacts').select('*')
      .order('needs_review', { ascending: false })
      .order('company_name', { ascending: true })
    setContacts(data || [])
    setContactsLoading(false)
  }

  async function loadClients() {
    setClientsLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients((data || []) as Client[])
    setClientsLoading(false)
  }

  async function loadVendors() {
    setVendorsLoading(true)
    const { data } = await supabase.from('vendors').select('*').order('name', { ascending: true })
    setVendors((data || []) as Vendor[])
    setVendorsLoading(false)
  }

  useEffect(() => { loadContacts(); loadClients(); loadVendors() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Contacts CRUD ──────────────────────────────────────────────────────────

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
    setSelected(null); setAddingNew(false); loadContacts()
  }

  async function handleDelete(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    toast.success('Contact deleted')
    setSelected(null); loadContacts()
  }

  // ── Promotion logic ────────────────────────────────────────────────────────

  async function handlePromote(contact: Contact, to: 'client' | 'vendor') {
    if (to === 'client') {
      await supabase.from('contacts').update({ persona: 'client' }).eq('id', contact.id)
      // Remove from vendors if previously promoted there
      await supabase.from('vendors').delete().eq('email', contact.email)
      const { error } = await supabase.from('clients').upsert(
        { email: contact.email, contact_id: contact.id, display_name: contact.display_name, company_name: contact.company_name },
        { onConflict: 'email' }
      )
      if (error) { toast.error(error.message); return }
      toast.success(`${contact.email} added as Client`)
      loadClients(); loadVendors(); loadContacts()
    } else {
      await supabase.from('contacts').update({ persona: 'vendor' }).eq('id', contact.id)
      // Remove from clients if previously promoted there
      await supabase.from('clients').delete().eq('email', contact.email)
      const { error } = await supabase.from('vendors').upsert(
        { email: contact.email, contact_id: contact.id, name: contact.display_name || contact.email, default_mode: 'email', is_active: true },
        { onConflict: 'email' }
      )
      if (error) { toast.error(error.message); return }
      toast.success(`${contact.email} added as Vendor`)
      loadVendors(); loadClients(); loadContacts()
    }
  }

  // ── Clients/Vendors CRUD ───────────────────────────────────────────────────

  async function deleteClient(id: string) {
    await supabase.from('clients').delete().eq('id', id)
    toast.success('Client removed'); setSelectedClient(null); loadClients()
  }

  async function deleteVendor(id: string) {
    await supabase.from('vendors').delete().eq('id', id)
    toast.success('Vendor removed'); setSelectedVendor(null); loadVendors()
  }

  // ── Contacts filtered/grouped ──────────────────────────────────────────────

  const needsReview = contacts.filter(c => c.needs_review)
  const filtered = contacts.filter(c => {
    const matchSearch = !search ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase())
    const matchPersona = personaFilter === 'all' || c.persona === personaFilter
    return matchSearch && matchPersona
  })
  const grouped: Record<string, Contact[]> = {}
  filtered.forEach(c => {
    const key = c.company_name || c.company_domain || c.email
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(c)
  })

  const filteredClients = clients.filter(c =>
    !search || c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredVendors = vendors.filter(v =>
    !search || v.email.toLowerCase().includes(search.toLowerCase()) ||
    v.name?.toLowerCase().includes(search.toLowerCase())
  )

  const showPane = tab === 'contacts' ? (selected || addingNew) :
    tab === 'clients' ? !!selectedClient :
    !!selectedVendor

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className={cn('flex flex-col bg-white border-r border-gray-200', showPane ? 'w-96 flex-shrink-0' : 'flex-1')}>

        {/* Tabs */}
        <div className="px-5 pt-4 pb-0 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">CRM</h2>
            {tab === 'contacts' && (
              <button onClick={() => { setSelected(null); setAddingNew(true) }}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors">
                <Plus size={13} /> Add contact
              </button>
            )}
            {tab === 'clients' && (
              <button onClick={async () => {
                const email = prompt('Client email:'); if (!email) return
                const name  = prompt('Display name (optional):') || undefined
                const company = prompt('Company (optional):') || undefined
                const { data: existing } = await supabase.from('contacts').select('id').eq('email', email).maybeSingle()
                let contactId = existing?.id
                if (!contactId) {
                  const { data: newC } = await supabase.from('contacts').insert({ email, display_name: name, company_name: company, persona: 'client', is_validated: true, needs_review: false }).select('id').single()
                  contactId = newC?.id
                }
                const { error } = await supabase.from('clients').upsert({ email, contact_id: contactId, display_name: name, company_name: company }, { onConflict: 'email' })
                if (error) { toast.error(error.message); return }
                toast.success('Client added'); loadClients(); loadContacts()
              }}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors">
                <Plus size={13} /> Add client
              </button>
            )}
            {tab === 'vendors' && (
              <button onClick={async () => {
                const email = prompt('Vendor email:'); if (!email) return
                const name  = prompt('Vendor / company name:') || email
                const { data: existing } = await supabase.from('contacts').select('id').eq('email', email).maybeSingle()
                let contactId = existing?.id
                if (!contactId) {
                  const { data: newC } = await supabase.from('contacts').insert({ email, display_name: name, persona: 'vendor', is_validated: true, needs_review: false }).select('id').single()
                  contactId = newC?.id
                }
                const { error } = await supabase.from('vendors').upsert({ email, contact_id: contactId, name, default_mode: 'email', is_active: true }, { onConflict: 'email' })
                if (error) { toast.error(error.message); return }
                toast.success('Vendor added'); loadVendors(); loadContacts()
              }}
                className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors">
                <Plus size={13} /> Add vendor
              </button>
            )}
          </div>

          <div className="flex gap-0 -mb-px">
            {([
              { key: 'contacts', label: 'Contacts', count: contacts.length },
              { key: 'clients',  label: 'Clients',  count: clients.length },
              { key: 'vendors',  label: 'Vendors',  count: vendors.length },
            ] as { key: Tab; label: string; count: number }[]).map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch('') }}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-4 py-2.5 border-b-2 transition-colors',
                  tab === t.key
                    ? 'border-blue-500 text-blue-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {t.label}
                <span className={cn('text-xs', tab === t.key ? 'text-blue-400' : 'text-gray-400')}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-2">
          {tab === 'contacts' && needsReview.length > 0 && (
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="text-slate-500 flex-shrink-0" />
              <p className="text-xs text-slate-700">
                <strong>{needsReview.length}</strong> contact{needsReview.length > 1 ? 's' : ''} need review
              </p>
            </div>
          )}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          {tab === 'contacts' && (
            <div className="flex gap-1 flex-wrap">
              {(['all', ...PERSONAS] as string[]).map(p => (
                <button key={p} onClick={() => setPersonaFilter(p)}
                  className={cn('text-xs px-2.5 py-1 rounded-md transition-colors capitalize',
                    personaFilter === p ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:bg-gray-100')}>
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Contacts tab ── */}
          {tab === 'contacts' && (
            <>
              {contactsLoading && <Spinner />}
              {!contactsLoading && Object.keys(grouped).length === 0 && (
                <Empty label="No contacts found" action={() => { setSelected(null); setAddingNew(true) }} actionLabel="Add your first contact" />
              )}
              {Object.entries(grouped).map(([group, groupContacts]) => (
                <div key={group}>
                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500">{group}</p>
                  </div>
                  {groupContacts.map(contact => (
                    <button key={contact.id}
                      onClick={() => { setSelected(contact); setAddingNew(false) }}
                      className={cn('w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-3',
                        selected?.id === contact.id && 'bg-blue-50 border-l-2 border-l-blue-500')}>
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0', PERSONA_COLORS[contact.persona])}>
                        {(contact.display_name || contact.email)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 truncate">{contact.display_name || contact.email}</span>
                          {contact.needs_review && <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                      </div>
                      <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* ── Clients tab ── */}
          {tab === 'clients' && (
            <>
              {clientsLoading && <Spinner />}
              {!clientsLoading && filteredClients.length === 0 && (
                <Empty label="No clients yet" action={undefined} />
              )}
              {filteredClients.map(client => (
                <button key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn('w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-3',
                    selectedClient?.id === client.id && 'bg-blue-50 border-l-2 border-l-blue-500')}>
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(client.display_name || client.email)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{client.display_name || client.email}</p>
                    <p className="text-xs text-gray-400 truncate">{client.company_name || client.email}</p>
                  </div>
                  {!client.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Inactive</span>}
                  <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </>
          )}

          {/* ── Vendors tab ── */}
          {tab === 'vendors' && (
            <>
              {vendorsLoading && <Spinner />}
              {!vendorsLoading && filteredVendors.length === 0 && (
                <Empty label="No vendors yet" action={undefined} />
              )}
              {filteredVendors.map(vendor => (
                <button key={vendor.id}
                  onClick={() => setSelectedVendor(vendor)}
                  className={cn('w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center gap-3',
                    selectedVendor?.id === vendor.id && 'bg-blue-50 border-l-2 border-l-blue-500')}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(vendor.name || vendor.email)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{vendor.name || vendor.email}</p>
                    <p className="text-xs text-gray-400 truncate">{vendor.email}</p>
                  </div>
                  {!vendor.is_active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Inactive</span>}
                  <ChevronRight size={13} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer count */}
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {tab === 'contacts' ? `${contacts.length} contacts` :
             tab === 'clients'  ? `${clients.length} clients` :
             `${vendors.length} vendors`}
          </p>
        </div>
      </div>

      {/* Detail pane */}
      {tab === 'contacts' && (selected || addingNew) && (
        <div className="flex-1 overflow-hidden">
          <ContactPane
            contact={addingNew ? null : selected}
            onSave={handleSave}
            onDelete={handleDelete}
            onPromote={handlePromote}
            onClose={() => { setSelected(null); setAddingNew(false) }}
          />
        </div>
      )}

      {tab === 'clients' && selectedClient && (
        <div className="flex-1 overflow-hidden">
          <ClientPane client={selectedClient} onClose={() => setSelectedClient(null)} onDelete={deleteClient} />
        </div>
      )}

      {tab === 'vendors' && selectedVendor && (
        <div className="flex-1 overflow-hidden">
          <VendorPane vendor={selectedVendor} onClose={() => setSelectedVendor(null)} onDelete={deleteVendor} />
        </div>
      )}

      {!showPane && (
        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
          <div className="text-center">
            {tab === 'contacts' && <UserPlus size={32} className="mx-auto mb-3 opacity-20" />}
            {tab === 'clients'  && <Building2 size={32} className="mx-auto mb-3 opacity-20" />}
            {tab === 'vendors'  && <Truck size={32} className="mx-auto mb-3 opacity-20" />}
            <p className="text-sm">
              {tab === 'contacts' ? 'Select a contact to view details' :
               tab === 'clients'  ? 'Select a client to view details' :
               'Select a vendor to view details'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}

function Empty({ label, action, actionLabel }: { label: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-sm">{label}</p>
      {action && actionLabel && (
        <button onClick={action} className="text-xs text-blue-600 mt-2 hover:underline">{actionLabel}</button>
      )}
    </div>
  )
}
