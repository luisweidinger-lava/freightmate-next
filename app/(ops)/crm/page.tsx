'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users, Search, X, AlertTriangle, Building2,
  ChevronRight, Pencil, UserPlus, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'
import { formatRelTime } from '@/lib/utils'
import type { Contact } from '@/lib/types'

// ── Constants ─────────────────────────────────────────────────────────────────

type Tab = 'all' | 'clients' | 'vendors' | 'orgs' | 'review'

const CONSUMER_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'me.com', 'live.com', 'msn.com', 'aol.com',
  'protonmail.com', 'googlemail.com',
])

const PERSONA_LABEL: Record<string, string> = {
  client: 'Client', vendor: 'Vendor',
  coordinator: 'Coordinator', internal: 'Internal', general: 'Other',
}
const PERSONA_PILL: Record<string, string> = {
  client: 'ok', vendor: 'info', coordinator: 'blue', internal: 'neutral', general: 'neutral',
}

function initials(contact: Contact): string {
  const name = contact.display_name || contact.email
  const parts = name.split(/[\s@]/).filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

// ── OrgRow type ───────────────────────────────────────────────────────────────

interface OrgRow {
  domain: string
  company_name: string
  count: number
  hasClient: boolean
  hasVendor: boolean
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditContactModal({ contact, onSave, onClose }: {
  contact: Contact
  onSave: (updated: Contact) => void
  onClose: () => void
}) {
  const [displayName, setDisplayName] = useState(contact.display_name ?? '')
  const [persona, setPersona]         = useState(contact.persona)
  const [companyName, setCompanyName] = useState(contact.company_name ?? '')
  const [notes, setNotes]             = useState(contact.notes ?? '')
  const [saving, setSaving]           = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    const { data, error } = await supabase.from('contacts').update({
      display_name: displayName.trim() || null,
      persona,
      company_name: companyName.trim() || null,
      notes: notes.trim() || null,
      needs_review: false,
      is_validated: true,
    }).eq('id', contact.id).select().single()
    if (error || !data) { setSaving(false); return }
    onSave(data as Contact)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24, width: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>Edit contact</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--es-n-400)' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--es-n-400)', marginBottom: 18, wordBreak: 'break-all' }}>{contact.email}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Full name</label>
            <input
              autoFocus
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Smith"
              style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Persona</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['client', 'vendor', 'general'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPersona(p)}
                  style={{
                    flex: 1, height: 30, borderRadius: 3, fontSize: 12, cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif', fontWeight: persona === p ? 700 : 400,
                    background: persona === p ? 'var(--es-brand)' : 'var(--es-n-0)',
                    color: persona === p ? 'white' : 'var(--es-n-600)',
                    border: `1px solid ${persona === p ? 'var(--es-brand)' : 'var(--es-n-150)'}`,
                  }}
                >
                  {p === 'general' ? 'Other' : PERSONA_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Company name</label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Hartmann Logistics"
              style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12, boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="es-rbtn primary" style={{ flex: 1, justifyContent: 'center', height: 34, fontSize: 13 }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button className="es-rbtn" style={{ justifyContent: 'center' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── New contact modal ─────────────────────────────────────────────────────────

function NewContactModal({ onSave, onClose }: {
  onSave: (c: Contact) => void
  onClose: () => void
}) {
  const [email, setEmail]           = useState('')
  const [displayName, setDisplayName] = useState('')
  const [persona, setPersona]       = useState<Contact['persona']>('client')
  const [companyName, setCompanyName] = useState('')
  const [saving, setSaving]         = useState(false)

  async function save() {
    if (saving || !email.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    if (!profile?.org_id) { setSaving(false); return }
    const domain = email.trim().split('@')[1] ?? ''
    const { data, error } = await supabase.from('contacts').upsert({
      email: email.trim(),
      display_name: displayName.trim() || null,
      persona,
      company_name: companyName.trim() || null,
      company_domain: domain || null,
      is_validated: true,
      needs_review: false,
      owner_user_id: user.id,
      org_id: profile.org_id,
      visibility_scope: 'org',
    }, { onConflict: 'email' }).select().single()
    if (error || !data) { setSaving(false); return }
    if (persona === 'client') {
      await supabase.from('clients').upsert({ contact_id: data.id, email: data.email, is_active: true }, { onConflict: 'contact_id' })
    } else if (persona === 'vendor') {
      await supabase.from('vendors').upsert({ contact_id: data.id, name: displayName.trim() || data.email, email: data.email, default_mode: 'air', is_active: true }, { onConflict: 'contact_id' })
    }
    onSave(data as Contact)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24, width: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 700 }}>New contact</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--es-n-400)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Email <span style={{ color: 'var(--es-urgent)' }}>*</span></label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contact@company.com"
              style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Full name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Jane Smith"
              style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Persona</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['client', 'vendor', 'general'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPersona(p)}
                  style={{
                    flex: 1, height: 30, borderRadius: 3, fontSize: 12, cursor: 'pointer',
                    fontFamily: 'Arial, sans-serif', fontWeight: persona === p ? 700 : 400,
                    background: persona === p ? 'var(--es-brand)' : 'var(--es-n-0)',
                    color: persona === p ? 'white' : 'var(--es-n-600)',
                    border: `1px solid ${persona === p ? 'var(--es-brand)' : 'var(--es-n-150)'}`,
                  }}
                >
                  {p === 'general' ? 'Other' : PERSONA_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Company name</label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="e.g. Hartmann Logistics"
              style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="es-rbtn primary" style={{ flex: 1, justifyContent: 'center', height: 34, fontSize: 13 }} onClick={save} disabled={saving || !email.trim()}>
            {saving ? 'Saving…' : 'Add contact'}
          </button>
          <button className="es-rbtn" style={{ justifyContent: 'center' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Contacts table ────────────────────────────────────────────────────────────

function ContactsTable({ rows, loading, onEdit }: {
  rows: Contact[]; loading: boolean; onEdit: (c: Contact) => void
}) {
  if (loading) return (
    <div className="es-card">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="es-skeleton" style={{ height: 40, margin: '8px 12px', borderRadius: 3 }} />
      ))}
    </div>
  )

  return (
    <div className="es-card cases-table-wrap">
      <table className="es-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 220 }} />
          <col style={{ width: 200 }} />
          <col style={{ width: 160 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 110 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 80 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Company</th>
            <th>Persona</th>
            <th>Status</th>
            <th>Added</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="empty-row">No contacts found</td></tr>
          )}
          {rows.map(c => (
            <tr key={c.id} className={c.needs_review ? 'row--amber' : ''}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="crm-avatar">{initials(c)}</div>
                  <span className="crm-name">{c.display_name || <span style={{ color: 'var(--es-n-400)', fontStyle: 'italic', fontWeight: 400 }}>No name</span>}</span>
                </div>
              </td>
              <td><span className="crm-email" style={{ fontSize: 12 }}>{c.email}</span></td>
              <td>
                {c.company_name
                  ? <span className="crm-company">{c.company_name}</span>
                  : c.company_domain && !CONSUMER_DOMAINS.has(c.company_domain)
                    ? <span className="crm-domain">{c.company_domain}</span>
                    : <span style={{ color: 'var(--es-n-300)' }}>—</span>
                }
              </td>
              <td>
                <span className={`es-pill ${PERSONA_PILL[c.persona] ?? 'neutral'}`}>
                  {PERSONA_LABEL[c.persona] ?? c.persona}
                </span>
              </td>
              <td>
                {c.needs_review
                  ? <span className="es-badge es-badge--amber">Needs review</span>
                  : c.is_validated
                    ? <span className="es-badge es-badge--green">Validated</span>
                    : <span className="es-badge es-badge--neutral">Unvalidated</span>
                }
              </td>
              <td><span className="cell-time">{formatRelTime(c.created_at)}</span></td>
              <td>
                <button className="crm-edit-btn" onClick={() => onEdit(c)}>
                  <Pencil size={11} /> Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        <span style={{ fontSize: 11, color: 'var(--es-n-400)' }}>{rows.length} contact{rows.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

// ── Orgs table ────────────────────────────────────────────────────────────────

function OrgsTable({ rows, loading, onViewPeople }: {
  rows: OrgRow[]; loading: boolean; onViewPeople: (domain: string) => void
}) {
  if (loading) return (
    <div className="es-card">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="es-skeleton" style={{ height: 40, margin: '8px 12px', borderRadius: 3 }} />
      ))}
    </div>
  )

  return (
    <div className="es-card cases-table-wrap">
      <table className="es-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 220 }} />
          <col style={{ width: 180 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 140 }} />
          <col style={{ width: 100 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Organisation</th>
            <th>Domain</th>
            <th>Contacts</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} className="empty-row">No organisations found</td></tr>
          )}
          {rows.map(org => (
            <tr key={org.domain}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--es-n-100)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Building2 size={14} style={{ color: 'var(--es-n-400)' }} />
                  </div>
                  <span className="crm-name">{org.company_name}</span>
                </div>
              </td>
              <td><span className="crm-domain" style={{ fontSize: 12 }}>{org.domain}</span></td>
              <td><span className="crm-count-chip">{org.count}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  {org.hasClient && <span className="es-pill ok">Client</span>}
                  {org.hasVendor && <span className="es-pill info">Vendor</span>}
                  {!org.hasClient && !org.hasVendor && <span className="es-pill neutral">Other</span>}
                </div>
              </td>
              <td>
                <button className="crm-view-btn" onClick={() => onViewPeople(org.domain)}>
                  View people <ChevronRight size={10} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        <span style={{ fontSize: 11, color: 'var(--es-n-400)' }}>{rows.length} organisation{rows.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

// ── CRM ribbon ────────────────────────────────────────────────────────────────

function CRMRibbon({ search, onSearch, count, onNew, onRefresh, refreshing }: {
  search: string; onSearch: (v: string) => void
  count: number; onNew: () => void
  onRefresh: () => void; refreshing: boolean
}) {
  return (
    <div className="es-ribbon">
      <div className="es-ribbon-group">
        <button className="es-rbtn primary" onClick={onNew}>
          <UserPlus size={12} /> New contact
        </button>
      </div>
      <div className="es-ribbon-group" style={{ flex: 1 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--es-n-300)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search name, email, company…"
            style={{ paddingLeft: 26, paddingRight: search ? 24 : 8, height: 28, width: 260, border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12 }}
          />
          {search && (
            <button onClick={() => onSearch('')} style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--es-n-300)' }}>
              <X size={11} />
            </button>
          )}
        </div>
      </div>
      <div className="es-ribbon-group">
        <button className="es-rbtn" onClick={onRefresh} disabled={refreshing} title="Refresh">
          <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
        </button>
        <span style={{ fontSize: 11, color: 'var(--es-n-400)', padding: '0 6px' }}>{count} contact{count !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

// ── Tab strip ─────────────────────────────────────────────────────────────────

function TabStrip({ active, reviewCount, onTab }: {
  active: Tab; reviewCount: number; onTab: (t: Tab) => void
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'clients', label: 'Clients' },
    { key: 'vendors', label: 'Vendors' },
    { key: 'orgs',    label: 'Organisations' },
    { key: 'review',  label: 'Review' },
  ]
  return (
    <div className="es-tab-strip" style={{ paddingLeft: 0, borderBottom: '1px solid var(--es-n-100)', background: 'var(--es-n-0)', marginBottom: 0 }}>
      {tabs.map(t => (
        <button
          key={t.key}
          className={`es-tab${active === t.key ? ' active' : ''}`}
          onClick={() => onTab(t.key)}
        >
          {t.label}
          {t.key === 'review' && reviewCount > 0 && (
            <span style={{ marginLeft: 5, minWidth: 16, height: 16, padding: '0 4px', background: active === 'review' ? 'var(--es-brand)' : 'var(--es-high)', color: 'white', borderRadius: 8, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {reviewCount}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Main CRM page ─────────────────────────────────────────────────────────────

function CRMPageInner() {
  const params     = useSearchParams()
  const router     = useRouter()

  const [contacts,     setContacts]     = useState<Contact[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [search,       setSearch]       = useState('')
  const [activeTab,    setActiveTab]    = useState<Tab>(() => {
    const f = params.get('filter'); const t = params.get('tab')
    if (f === 'review' || t === 'review') return 'review'
    if (t === 'clients') return 'clients'
    if (t === 'vendors') return 'vendors'
    if (t === 'orgs')    return 'orgs'
    return 'all'
  })
  const [domainFilter, setDomainFilter] = useState<string | null>(null)
  const [editContact,  setEditContact]  = useState<Contact | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    setContacts((data ?? []) as Contact[])
    if (!silent) setLoading(false); else setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Derived: filtered contacts
  const filtered = useMemo(() => {
    let rows = contacts
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(c =>
        c.email.toLowerCase().includes(q) ||
        (c.display_name ?? '').toLowerCase().includes(q) ||
        (c.company_name ?? '').toLowerCase().includes(q) ||
        (c.company_domain ?? '').toLowerCase().includes(q)
      )
    }
    if (activeTab === 'clients') rows = rows.filter(c => c.persona === 'client')
    if (activeTab === 'vendors') rows = rows.filter(c => c.persona === 'vendor')
    if (activeTab === 'review')  rows = rows.filter(c => c.needs_review)
    if (domainFilter)            rows = rows.filter(c => c.company_domain === domainFilter)
    return rows
  }, [contacts, search, activeTab, domainFilter])

  // Derived: organisations
  const orgs = useMemo((): OrgRow[] => {
    const map = new Map<string, Contact[]>()
    contacts.forEach(c => {
      if (!c.company_domain || CONSUMER_DOMAINS.has(c.company_domain)) return
      const list = map.get(c.company_domain) ?? []
      list.push(c); map.set(c.company_domain, list)
    })
    return Array.from(map.entries())
      .map(([domain, people]) => ({
        domain,
        company_name: people.find(p => p.company_name)?.company_name ?? domain,
        count: people.length,
        hasClient: people.some(p => p.persona === 'client'),
        hasVendor: people.some(p => p.persona === 'vendor'),
      }))
      .sort((a, b) => b.count - a.count)
  }, [contacts])

  const reviewCount = useMemo(() => contacts.filter(c => c.needs_review).length, [contacts])

  function handleTabChange(t: Tab) {
    setActiveTab(t); setDomainFilter(null)
  }

  function handleViewPeople(domain: string) {
    setActiveTab('all'); setDomainFilter(domain)
  }

  function handleEditSave(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditContact(null)
  }

  function handleNewSave(added: Contact) {
    setContacts(prev => [added, ...prev])
    setShowNewModal(false)
  }

  return (
    <>
      {editContact  && <EditContactModal contact={editContact}  onSave={handleEditSave} onClose={() => setEditContact(null)} />}
      {showNewModal && <NewContactModal onSave={handleNewSave} onClose={() => setShowNewModal(false)} />}

      <CRMRibbon
        search={search}
        onSearch={setSearch}
        count={contacts.length}
        onNew={() => setShowNewModal(true)}
        onRefresh={() => load(true)}
        refreshing={refreshing}
      />

      <main className="crm-main">
        {/* Review queue banner */}
        {reviewCount > 0 && activeTab !== 'review' && (
          <div className="es-triage-bar" style={{ cursor: 'pointer', borderRadius: 4 }} onClick={() => handleTabChange('review')}>
            <div className="es-triage-title">
              <AlertTriangle size={13} />
              {reviewCount} contact{reviewCount !== 1 ? 's' : ''} need CRM review — click to resolve
              <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
            </div>
          </div>
        )}

        {/* Domain filter chip */}
        {domainFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
            <span style={{ fontSize: 11, color: 'var(--es-n-400)' }}>Filtered by org:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--es-brand-light)', color: 'var(--es-brand-text)', border: '1px solid var(--es-brand-border)', borderRadius: 12, padding: '1px 8px', fontSize: 11 }}>
              {domainFilter}
              <button onClick={() => setDomainFilter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--es-brand-text)', padding: 0 }}>
                <X size={10} />
              </button>
            </span>
          </div>
        )}

        <TabStrip active={activeTab} reviewCount={reviewCount} onTab={handleTabChange} />

        {activeTab === 'orgs'
          ? <OrgsTable rows={orgs} loading={loading} onViewPeople={handleViewPeople} />
          : <ContactsTable rows={filtered} loading={loading} onEdit={setEditContact} />
        }
      </main>
    </>
  )
}

export default function CRMPage() {
  return (
    <Suspense>
      <CRMPageInner />
    </Suspense>
  )
}
