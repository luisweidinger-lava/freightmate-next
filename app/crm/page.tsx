'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Contact, Client, Vendor } from '@/lib/types'
import { EmailMessage } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  Users, Truck, Building2, AlertTriangle, Plus, Trash2, X,
  Save, ChevronRight, Mail, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Persona = 'client' | 'vendor' | 'coordinator'

type EditTarget =
  | { type: 'client';      record: Client }
  | { type: 'vendor';      record: Vendor }
  | { type: 'coordinator'; record: Contact }

// ─── Add Contact flow ─────────────────────────────────────────────────────────

function AddContactPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep]       = useState<'persona' | 'form'>('persona')
  const [persona, setPersona] = useState<Persona>('client')
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    display_name: '', email: '', company_name: '', notes: '',
    default_mode: 'email',
  })

  function field(key: keyof typeof form, label: string, placeholder?: string) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
          type={key === 'email' ? 'email' : 'text'}
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300/40 focus:border-violet-400"
        />
      </div>
    )
  }

  async function handleSave() {
    if (!form.email.trim()) { toast.error('Email is required'); return }
    setSaving(true)
    try {
      // Insert contact
      const { data: contact, error: cErr } = await supabase
        .from('contacts')
        .insert({
          email:        form.email.trim(),
          display_name: form.display_name.trim() || null,
          persona,
          company_name: form.company_name.trim() || null,
          is_validated: true,
          needs_review: false,
        })
        .select()
        .single()

      if (cErr || !contact) { toast.error(cErr?.message || 'Could not create contact'); setSaving(false); return }

      // Insert into persona-specific table
      if (persona === 'client') {
        await supabase.from('clients').insert({
          contact_id:   contact.id,
          email:        form.email.trim(),
          display_name: form.display_name.trim() || null,
          company_name: form.company_name.trim() || null,
          notes:        form.notes.trim() || null,
          is_active:    true,
        })
      } else if (persona === 'vendor') {
        await supabase.from('vendors').insert({
          contact_id:   contact.id,
          name:         form.display_name.trim() || form.email.trim(),
          email:        form.email.trim(),
          default_mode: form.default_mode,
          is_active:    true,
        })
      }

      toast.success('Contact added')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const PERSONAS: { key: Persona; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'client',      icon: <Building2 size={20} />, label: 'Client',      desc: 'Shipper / customer who sends freight requests' },
    { key: 'vendor',      icon: <Truck size={20} />,     label: 'Vendor',      desc: 'Freight carrier or logistics partner' },
    { key: 'coordinator', icon: <Users size={20} />,     label: 'Coordinator', desc: 'Internal shipment coordinator or team member' },
  ]

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-display">
            {step === 'persona' ? 'Add Contact — Select Role' : `Add ${persona.charAt(0).toUpperCase() + persona.slice(1)}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === 'persona' ? (
            <div className="space-y-2.5">
              {PERSONAS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setPersona(p.key); setStep('form') }}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left group"
                >
                  <span className="text-gray-400 group-hover:text-violet-500 transition-colors">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-violet-700">{p.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-violet-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {field('email',        'Email address *', 'contact@example.com')}
              {field('display_name', persona === 'vendor' ? 'Company / Vendor name' : 'Full name', 'e.g. Klaus Weber')}
              {(persona === 'client' || persona === 'vendor') && field('company_name', 'Company name', 'e.g. Apex Cargo GmbH')}
              {persona === 'client' && field('notes', 'Notes (optional)', 'Payment terms, preferences…')}
              {persona === 'vendor' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Default contact mode</label>
                  <select
                    value={form.default_mode}
                    onChange={e => setForm(f => ({ ...f, default_mode: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300/40"
                  >
                    <option value="email">Email</option>
                    <option value="portal">Portal</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('persona')}
                  className="text-xs text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-violet-600 text-white rounded-lg py-2 hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  <Save size={13} />
                  {saving ? 'Saving…' : 'Save Contact'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Edit / Delete side panel ─────────────────────────────────────────────────

function EditPanel({ target, onClose, onSaved }: {
  target: EditTarget
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm]       = useState<Record<string, string | boolean>>({})

  useEffect(() => {
    if (target.type === 'client') {
      const r = target.record
      setForm({ display_name: r.display_name || '', email: r.email, company_name: r.company_name || '', notes: r.notes || '', is_active: r.is_active })
    } else if (target.type === 'vendor') {
      const r = target.record
      setForm({ name: r.name, email: r.email, default_mode: r.default_mode, is_active: r.is_active })
    } else {
      const r = target.record
      setForm({ display_name: r.display_name || '', email: r.email, company_name: r.company_name || '', notes: r.notes || '' })
    }
  }, [target])

  function textField(key: string, label: string) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input
          type="text"
          value={String(form[key] ?? '')}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300/40"
        />
      </div>
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (target.type === 'client') {
        await supabase.from('clients').update({
          display_name: String(form.display_name) || null,
          company_name: String(form.company_name) || null,
          notes:        String(form.notes) || null,
          is_active:    Boolean(form.is_active),
        }).eq('id', target.record.id)
      } else if (target.type === 'vendor') {
        await supabase.from('vendors').update({
          name:         String(form.name),
          default_mode: String(form.default_mode),
          is_active:    Boolean(form.is_active),
        }).eq('id', target.record.id)
      } else {
        await supabase.from('contacts').update({
          display_name: String(form.display_name) || null,
          company_name: String(form.company_name) || null,
          notes:        String(form.notes) || null,
        }).eq('id', target.record.id)
      }
      toast.success('Saved')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    setDeleting(true)
    try {
      if (target.type === 'client') {
        await supabase.from('clients').delete().eq('id', target.record.id)
      } else if (target.type === 'vendor') {
        await supabase.from('vendors').delete().eq('id', target.record.id)
      } else {
        await supabase.from('contacts').delete().eq('id', target.record.id)
      }
      toast.success('Deleted')
      onSaved()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const typeLabel = target.type.charAt(0).toUpperCase() + target.type.slice(1)

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Edit {typeLabel}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Email — read only */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <p className="text-sm text-gray-700">{String(form.email ?? (target.record as Client | Vendor | Contact).email ?? '')}</p>
        </div>

        {target.type === 'client' && (
          <>
            {textField('display_name', 'Contact name')}
            {textField('company_name', 'Company')}
            {textField('notes', 'Notes')}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={Boolean(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-violet-600" />
              Active
            </label>
          </>
        )}
        {target.type === 'vendor' && (
          <>
            {textField('name', 'Vendor name')}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Default mode</label>
              <select
                value={String(form.default_mode ?? 'email')}
                onChange={e => setForm(f => ({ ...f, default_mode: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="email">Email</option>
                <option value="portal">Portal</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={Boolean(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-violet-600" />
              Active
            </label>
          </>
        )}
        {target.type === 'coordinator' && (
          <>
            {textField('display_name', 'Name')}
            {textField('company_name', 'Team / department')}
            {textField('notes', 'Notes')}
          </>
        )}

        <div className="pt-2 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-violet-600 text-white rounded-lg py-2 hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-600 border border-red-200 rounded-lg py-2 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={13} />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Role change note */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          To change a contact&apos;s role, delete this record and add them again with the correct role.
        </p>
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
      <span className="text-gray-500">{icon}</span>
      <h2 className="text-sm font-bold text-gray-800 font-display">{title}</h2>
      <span className="ml-1 text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  )
}

// ─── Table components ─────────────────────────────────────────────────────────

function TableRow({ cols, onClick }: { cols: (string | React.ReactNode)[]; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-gray-100 text-sm transition-colors',
        onClick ? 'cursor-pointer hover:bg-gray-50 group' : '',
      )}
    >
      {cols.map((col, i) => (
        <td key={i} className="px-5 py-3 text-gray-600">
          {col}
          {onClick && i === cols.length - 1 && (
            <ChevronRight size={13} className="inline ml-2 text-gray-300 group-hover:text-violet-400 transition-colors" />
          )}
        </td>
      ))}
    </tr>
  )
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50/60">
        {cols.map(col => (
          <th key={col} className="px-5 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const router = useRouter()
  const [clients, setClients]           = useState<Client[]>([])
  const [vendors, setVendors]           = useState<Vendor[]>([])
  const [coordinators, setCoordinators] = useState<Contact[]>([])
  const [unmatched, setUnmatched]       = useState<EmailMessage[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)
  const [editTarget, setEditTarget]     = useState<EditTarget | null>(null)

  const load = useCallback(async () => {
    const [cRes, vRes, coRes, uRes] = await Promise.all([
      supabase.from('clients').select('*').order('company_name', { ascending: true }),
      supabase.from('vendors').select('*, contacts(display_name)').order('name', { ascending: true }),
      supabase.from('contacts').select('*').eq('persona', 'coordinator').order('display_name', { ascending: true }),
      supabase.from('email_messages').select('*').is('case_id', null).eq('folder', 'inbox')
        .order('created_at', { ascending: false }).limit(50),
    ])
    setClients((cRes.data || []) as Client[])
    setVendors((vRes.data || []) as Vendor[])
    setCoordinators((coRes.data || []) as Contact[])
    setUnmatched((uRes.data || []) as EmailMessage[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/30">
        {/* Page header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 font-display">CRM</h1>
            <p className="text-xs text-gray-400 mt-0.5">Contacts, vendors, and unmatched email addresses</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>

        <div className="divide-y divide-gray-200">

          {/* ── Clients ─────────────────────────────────────────────────────── */}
          <section className="bg-white">
            <SectionHeader icon={<Building2 size={16} />} title="Clients" count={clients.length} />
            {clients.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No clients yet</p>
            ) : (
              <table className="w-full">
                <TableHead cols={['Company', 'Contact', 'Email', 'Status', 'Since', '']} />
                <tbody>
                  {clients.map(c => (
                    <TableRow
                      key={c.id}
                      onClick={() => setEditTarget({ type: 'client', record: c })}
                      cols={[
                        <span className="font-medium text-gray-800">{c.company_name || '—'}</span>,
                        c.display_name || '—',
                        <span className="text-gray-500">{c.email}</span>,
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.is_active ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400')}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>,
                        <span className="text-gray-400 text-xs">{formatDate(c.created_at)}</span>,
                        '',
                      ]}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ── Vendors ─────────────────────────────────────────────────────── */}
          <section className="bg-white mt-3">
            <SectionHeader icon={<Truck size={16} />} title="Vendors" count={vendors.length} />
            {vendors.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No vendors yet</p>
            ) : (
              <table className="w-full">
                <TableHead cols={['Company', 'Contact', 'Email', 'Status', 'Since', '']} />
                <tbody>
                  {vendors.map(v => (
                    <TableRow
                      key={v.id}
                      onClick={() => setEditTarget({ type: 'vendor', record: v })}
                      cols={[
                        <span className="font-medium text-gray-800">{v.name}</span>,
                        v.contacts?.display_name || '—',
                        <span className="text-gray-500">{v.email}</span>,
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', v.is_active ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400')}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>,
                        <span className="text-gray-400 text-xs">{formatDate(v.created_at)}</span>,
                        '',
                      ]}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ── Coordinators ────────────────────────────────────────────────── */}
          <section className="bg-white mt-3">
            <SectionHeader icon={<Users size={16} />} title="Coordinators" count={coordinators.length} />
            {coordinators.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">No coordinators yet</p>
            ) : (
              <table className="w-full">
                <TableHead cols={['Company', 'Contact', 'Email', 'Status', 'Since', '']} />
                <tbody>
                  {coordinators.map(c => (
                    <TableRow
                      key={c.id}
                      onClick={() => setEditTarget({ type: 'coordinator', record: c })}
                      cols={[
                        c.company_name || '—',
                        <span className="font-medium text-gray-800">{c.display_name || '—'}</span>,
                        <span className="text-gray-500">{c.email}</span>,
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.is_validated ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500')}>
                          {c.is_validated ? 'Validated' : 'Unvalidated'}
                        </span>,
                        <span className="text-gray-400 text-xs">{formatDate(c.created_at)}</span>,
                        '',
                      ]}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* ── Unmatched Emails ─────────────────────────────────────────────── */}
          <section className="bg-white mt-3">
            <SectionHeader icon={<AlertTriangle size={16} />} title="Unmatched Emails" count={unmatched.length} />
            <p className="px-6 py-2 text-xs text-gray-400 border-b border-gray-100">
              Inbox emails not yet linked to a case. Triage these in Inbox or link them to a case.
            </p>
            {unmatched.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">All inbox emails are matched ✓</p>
            ) : (
              <table className="w-full">
                <TableHead cols={['Sender', 'Subject', 'Received', 'Action']} />
                <tbody>
                  {unmatched.map(e => (
                    <TableRow
                      key={e.id}
                      cols={[
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <Mail size={12} className="text-gray-400 flex-shrink-0" />
                          {e.sender_email || '—'}
                        </span>,
                        <span className="text-gray-500 truncate max-w-xs block">{e.subject || '(no subject)'}</span>,
                        <span className="text-gray-400 text-xs">{formatDate(e.created_at)}</span>,
                        <button
                          onClick={() => router.push('/inbox')}
                          className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
                        >
                          <ExternalLink size={11} /> Open in Inbox
                        </button>,
                      ]}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </section>

        </div>
      </div>

      {/* Edit panel */}
      {editTarget && (
        <EditPanel
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}

      {/* Add contact modal */}
      {showAdd && (
        <AddContactPanel
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}
    </div>
  )
}
