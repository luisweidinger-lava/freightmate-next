'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Contact } from '@/lib/types'
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, X, Package } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Persona = 'vendor' | 'client' | 'internal'

interface ContactDraft {
  display_name: string
  emails: string[]
  company_name: string
  company_domain: string
}

const STEPS = [
  { id: 'welcome',  label: 'Welcome'   },
  { id: 'vendors',  label: 'Vendors'   },
  { id: 'clients',  label: 'Clients'   },
  { id: 'internal', label: 'Internal'  },
  { id: 'done',     label: 'Done'      },
]

function EmailInput({
  emails, onChange,
}: {
  emails: string[]
  onChange: (emails: string[]) => void
}) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim().toLowerCase()
    if (!trimmed || emails.includes(trimmed)) return
    onChange([...emails, trimmed])
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="email@example.com"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {emails.map(e => (
          <span key={e} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
            {e}
            <button
              type="button"
              onClick={() => onChange(emails.filter(x => x !== e))}
              className="hover:text-red-600 transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

function ContactForm({
  persona, contacts, onChange,
}: {
  persona: Persona
  contacts: ContactDraft[]
  onChange: (contacts: ContactDraft[]) => void
}) {
  function addContact() {
    onChange([...contacts, { display_name: '', emails: [], company_name: '', company_domain: '' }])
  }

  function update(idx: number, field: keyof ContactDraft, value: string | string[]) {
    const updated = contacts.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    // Auto-fill domain from first email
    if (field === 'emails' && Array.isArray(value) && value.length > 0) {
      const domain = value[0].split('@')[1] || ''
      const isGeneric = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com'].includes(domain)
      if (!isGeneric && !updated[idx].company_domain) {
        updated[idx] = { ...updated[idx], company_domain: domain }
      }
    }
    onChange(updated)
  }

  function remove(idx: number) {
    onChange(contacts.filter((_, i) => i !== idx))
  }

  const PERSONA_LABELS: Record<Persona, string> = {
    vendor:   'Vendor / Freight Partner',
    client:   'Client / Shipper',
    internal: 'Internal / Coordinator Email',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Add all known {PERSONA_LABELS[persona].toLowerCase()} email addresses.
        {persona !== 'internal' && ' Include all email addresses they use — the system groups them by company domain.'}
      </p>

      {contacts.map((contact, idx) => (
        <div key={idx} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {persona === 'internal' ? 'Internal Account' : `${PERSONA_LABELS[persona]} ${idx + 1}`}
            </span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {persona !== 'internal' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Company / Display Name</label>
                <input
                  type="text"
                  value={contact.company_name}
                  onChange={e => update(idx, 'company_name', e.target.value)}
                  placeholder="FreightMate Ltd."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Domain (auto-filled)</label>
                <input
                  type="text"
                  value={contact.company_domain}
                  onChange={e => update(idx, 'company_domain', e.target.value)}
                  placeholder="freightmate.com"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}

          {persona === 'internal' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Label</label>
              <input
                type="text"
                value={contact.display_name}
                onChange={e => update(idx, 'display_name', e.target.value)}
                placeholder="Info inbox / My coordinator email"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">
              Email address{persona !== 'internal' ? 'es (add all known)' : ''}
            </label>
            <EmailInput
              emails={contact.emails}
              onChange={v => update(idx, 'emails', v)}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addContact}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded-xl px-4 py-3 w-full justify-center hover:bg-blue-50 transition-colors"
      >
        <Plus size={15} />
        Add {persona !== 'internal' ? PERSONA_LABELS[persona] : 'internal account'}
      </button>
    </div>
  )
}

interface OnboardingWizardProps {
  onComplete: () => void
  onSkip:     () => void
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep]         = useState(0)
  const [saving, setSaving]     = useState(false)
  const [vendors, setVendors]   = useState<ContactDraft[]>([])
  const [clients, setClients]   = useState<ContactDraft[]>([])
  const [internal, setInternal] = useState<ContactDraft[]>([])

  async function handleSave() {
    setSaving(true)

    const rows: Omit<Contact, 'id' | 'created_at'>[] = []

    function addRows(contacts: ContactDraft[], persona: Persona) {
      contacts.forEach(c => {
        c.emails.forEach(email => {
          rows.push({
            email,
            display_name:   c.display_name || c.company_name || null,
            persona,
            company_name:   c.company_name || null,
            company_domain: c.company_domain || null,
            is_validated:   true,
            needs_review:   false,
            notes:          null,
          })
        })
      })
    }

    addRows(vendors, 'vendor')
    addRows(clients, 'client')
    addRows(internal, 'internal')

    if (rows.length > 0) {
      const { error } = await supabase
        .from('contacts')
        .upsert(rows, { onConflict: 'email' })

      if (error) {
        toast.error('Failed to save contacts — ' + error.message)
        setSaving(false)
        return
      }
    }

    toast.success(`${rows.length} contacts saved`)
    setSaving(false)
    setStep(4) // done step
  }

  const STEP_CONTENTS = [
    // Step 0: Welcome
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
        <Package size={32} className="text-blue-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Welcome to AxisLog</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          Before you start, let&apos;s set up your contact directory.
          This tells the system who is a client, vendor, or internal account — so emails are automatically matched.
        </p>
      </div>
      <div className="bg-blue-50 rounded-xl p-4 text-left text-sm text-blue-800 space-y-1.5">
        <p className="font-semibold text-blue-900">You&apos;ll set up:</p>
        <p>✦ Freight vendors &amp; their email addresses</p>
        <p>✦ Clients &amp; shippers</p>
        <p>✦ Your own internal / info@ email addresses</p>
      </div>
      <p className="text-xs text-gray-400">
        You can skip this and come back later via CRM &amp; Contacts — but the email board won&apos;t match emails correctly until it&apos;s done.
      </p>
    </div>,

    // Step 1: Vendors
    <ContactForm persona="vendor" contacts={vendors} onChange={setVendors} />,

    // Step 2: Clients
    <ContactForm persona="client" contacts={clients} onChange={setClients} />,

    // Step 3: Internal
    <ContactForm persona="internal" contacts={internal} onChange={setInternal} />,

    // Step 4: Done
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
        <Check size={32} className="text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">You&apos;re all set</h2>
        <p className="text-sm text-gray-500 mt-2">
          {vendors.reduce((n, c) => n + c.emails.length, 0) +
           clients.reduce((n, c) => n + c.emails.length, 0) +
           internal.reduce((n, c) => n + c.emails.length, 0)} email addresses saved.
          The system will now automatically classify incoming emails.
        </p>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 space-y-1.5">
        <p>✦ You can always add more contacts from <strong>CRM &amp; Contacts</strong></p>
        <p>✦ Unknown senders will show a &quot;needs review&quot; alert</p>
        <p>✦ All emails now go through 3-tier matching (thread → Ref → triage)</p>
      </div>
    </div>,
  ]

  const STEP_TITLES = ['', 'Add Vendors', 'Add Clients', 'Add Internal Emails', '']

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Progress bar */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            {step < 4 && (
              <button
                onClick={onSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip for now
              </button>
            )}
            {step === 4 && <div />}
            <span className="text-xs text-gray-400 ml-auto">
              {step < 4 ? `Step ${step + 1} of ${STEPS.length}` : 'Complete'}
            </span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= step ? 'bg-blue-500' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
          {STEP_TITLES[step] && (
            <p className="text-sm font-semibold text-gray-900 mt-3">{STEP_TITLES[step]}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {STEP_CONTENTS[step]}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0 || step === 4}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={15} /> Back
          </button>

          {step < 3 && (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Next <ChevronRight size={15} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
            >
              <Check size={15} />
              {saving ? 'Saving…' : 'Save & Finish'}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Open Dashboard <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
