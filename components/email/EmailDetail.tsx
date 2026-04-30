'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Send, ChevronDown, ChevronRight, Trash2,
  ReplyAll, Forward, Star, AlertOctagon,
  AlertTriangle, Link2, Plus, X, Lightbulb,
} from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { EmailMessage, ShipmentCase } from '@/lib/types'
import InlineReply from '@/components/email/InlineReply'
import ThreadView, { ThreadSummaryStrip } from '@/components/email/ThreadView'
import { toast } from 'sonner'
import { formatRef } from '@/lib/utils'

function statusPillClass(status: string | undefined): string {
  if (!status) return 'neutral'
  if (['delivered', 'client_confirmed'].includes(status)) return 'ok'
  if (['in_transit', 'booked'].includes(status)) return 'info'
  if (['quote_received', 'vendor_requested'].includes(status)) return 'high'
  return 'neutral'
}

function statusLabel(status: string | undefined): string {
  return ({
    delivered: 'Delivered', client_confirmed: 'Confirmed',
    in_transit: 'In transit', booked: 'Booked',
    quote_received: 'Quote received', vendor_requested: 'Vendor requested',
  } as Record<string, string>)[status || ''] || (status || '—')
}

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

// ── Persona block ────────────────────────────────────────────────────────────

const CONSUMER_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'me.com', 'live.com', 'msn.com', 'aol.com',
  'protonmail.com', 'googlemail.com',
])

function PersonaBlock({ email, onDone }: { email: EmailMessage; onDone: () => void }) {
  const [status, setStatus] = useState<'loading' | 'unknown' | 'known' | 'saved'>('loading')
  const [orgSuggestion, setOrgSuggestion] = useState<{ name: string; type: 'client' | 'vendor' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCrmModal, setShowCrmModal] = useState(false)
  const [pendingPersona, setPendingPersona] = useState<'client' | 'vendor' | 'general' | null>(null)
  const [fullName, setFullName] = useState('')
  const [linkOrg, setLinkOrg] = useState(false)

  useEffect(() => {
    async function check() {
      if (!email.sender_email) { setStatus('known'); return }
      const { data: existing } = await supabase
        .from('contacts').select('id').eq('email', email.sender_email).maybeSingle()
      if (existing) { setStatus('known'); return }
      const domain = email.sender_email.split('@')[1] ?? ''
      if (domain && !CONSUMER_DOMAINS.has(domain)) {
        const [{ data: clientMatch }, { data: vendorMatch }] = await Promise.all([
          supabase.from('clients').select('display_name,company_name,email').ilike('email', `%@${domain}`).limit(1).maybeSingle(),
          supabase.from('vendors').select('name,email').ilike('email', `%@${domain}`).limit(1).maybeSingle(),
        ])
        if (clientMatch) {
          setOrgSuggestion({ name: (clientMatch as any).display_name || (clientMatch as any).company_name || clientMatch.email, type: 'client' })
          setLinkOrg(true)
        } else if (vendorMatch) {
          setOrgSuggestion({ name: (vendorMatch as any).name || vendorMatch.email, type: 'vendor' })
          setLinkOrg(true)
        }
      }
      setStatus('unknown')
    }
    check()
  }, [email.id, email.sender_email])

  async function skipContact() {
    if (saving) return
    setSaving(true)
    await supabase.from('contacts').upsert({
      email: email.sender_email || '', display_name: null,
      persona: 'general', is_validated: false, needs_review: true,
    }, { onConflict: 'email' })
    setSaving(false); setStatus('saved'); onDone()
  }

  async function saveContact() {
    if (saving || !pendingPersona) return
    setSaving(true)
    const domain = email.sender_email?.split('@')[1] ?? ''
    const { data: contact, error } = await supabase.from('contacts').upsert({
      email: email.sender_email || '',
      display_name: fullName.trim() || null,
      persona: pendingPersona,
      is_validated: true,
      needs_review: false,
      company_name: (linkOrg && orgSuggestion) ? orgSuggestion.name : null,
      company_domain: domain || null,
    }, { onConflict: 'email' }).select().single()
    if (error) { toast.error('Could not save contact'); setSaving(false); return }
    if (contact && pendingPersona === 'client') {
      await supabase.from('clients').upsert({ contact_id: contact.id, email: email.sender_email || '', is_active: true }, { onConflict: 'contact_id' })
    } else if (contact && pendingPersona === 'vendor') {
      await supabase.from('vendors').upsert({ contact_id: contact.id, name: fullName.trim() || email.sender_email || '', email: email.sender_email || '', default_mode: 'air', is_active: true }, { onConflict: 'contact_id' })
    }
    setSaving(false); setShowCrmModal(false); setStatus('saved'); onDone()
  }

  function openModal(persona: 'client' | 'vendor' | 'general') {
    setPendingPersona(persona); setFullName(''); setShowCrmModal(true)
  }

  if (status !== 'unknown') return null

  const personaLabel = pendingPersona === 'client' ? 'Client' : pendingPersona === 'vendor' ? 'Vendor' : 'Other contact'

  return (
    <>
      {showCrmModal && pendingPersona && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}
          onKeyDown={e => e.key === 'Escape' && setShowCrmModal(false)}
        >
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24, width: 420 }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Add contact — {personaLabel}</p>
            <p style={{ fontSize: 12, color: 'var(--es-n-400)', marginBottom: 18, wordBreak: 'break-all' }}>{email.sender_email}</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--es-n-500)', marginBottom: 4 }}>Full name</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Jane Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveContact()}
                style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid var(--es-n-150)', borderRadius: 3, fontFamily: 'Arial, sans-serif', fontSize: 12, boxSizing: 'border-box' }}
              />
            </div>
            {orgSuggestion && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, background: 'var(--es-high-bg)', border: '1px solid var(--es-high-bd)', borderRadius: 4, padding: '7px 10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={linkOrg} onChange={e => setLinkOrg(e.target.checked)} style={{ cursor: 'pointer', flexShrink: 0 }} />
                <Lightbulb size={11} style={{ color: 'var(--es-high)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--es-high)', fontWeight: 600 }}>Link to {orgSuggestion.name}</span>
                <span className={`es-pill ${orgSuggestion.type === 'client' ? 'ok' : 'info'}`}>{orgSuggestion.type}</span>
              </label>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="es-rbtn primary" style={{ justifyContent: 'center', height: 34, fontSize: 13, width: '100%' }} onClick={saveContact} disabled={saving}>
                {saving ? 'Saving…' : 'Save contact'}
              </button>
              <button onClick={() => { skipContact(); setShowCrmModal(false) }} style={{ width: '100%', fontSize: 11, color: 'var(--es-n-400)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="es-persona-bar">
        <div className="es-persona-header">
          <AlertTriangle size={13} />
          Unknown sender: <strong>{email.sender_email}</strong>
        </div>
        {orgSuggestion && (
          <div className="es-persona-suggestion">
            <Lightbulb size={11} />
            Domain match: <strong>{orgSuggestion.name}</strong>
            <span className={`es-pill ${orgSuggestion.type === 'client' ? 'ok' : 'info'}`}>{orgSuggestion.type}</span>
            <button className="es-rbtn" onClick={() => openModal(orgSuggestion.type)} disabled={saving}>
              Confirm match
            </button>
          </div>
        )}
        <div className="es-persona-row">
          <span className="es-persona-label">Who is this contact?</span>
          <button className="es-rbtn primary" onClick={() => openModal('client')} disabled={saving}>Client</button>
          <button className="es-rbtn es-rbtn-vendor" onClick={() => openModal('vendor')} disabled={saving}>Vendor</button>
          <button className="es-rbtn" onClick={() => openModal('general')} disabled={saving}>Other</button>
          <button className="es-rbtn es-persona-skip" onClick={skipContact} disabled={saving}>
            Skip for now <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </>
  )
}

// ── Triage block ─────────────────────────────────────────────────────────────

function TriageBlock({ email, onDone }: { email: EmailMessage; onDone: () => void }) {
  const [refInput, setRefInput] = useState('')
  const [linking, setLinking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showOtherInput, setShowOtherInput] = useState(false)
  const [otherLabel, setOtherLabel] = useState('')
  const [pendingAction, setPendingAction] = useState<'link' | 'create' | null>(null)
  const router = useRouter()

  async function handleTypeSelected(type: 'client' | 'vendor' | 'other', label?: string) {
    setShowTypeModal(false)
    setShowOtherInput(false)
    if (pendingAction === 'create') {
      setCreating(true)
      const res = await fetch('/api/create-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refNumber: refInput.trim(),
          senderEmail: email.sender_email || '',
          senderType: type,
          label: label ?? null,
          emailId: email.id,
          nylasThreadId: email.nylas_thread_id || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Could not create case — check Ref is unique'); setCreating(false); setPendingAction(null); return }
      toast.success(`Case created: ${formatRef(refInput.trim())}`)
      setCreating(false)
      onDone()
      router.push(`/cases/${refInput.trim()}`)
    } else {
      setLinking(true)
      const res = await fetch('/api/link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          refNumber: refInput.trim(),
          channelType: type,
          label: label ?? null,
          nylasThreadId: email.nylas_thread_id ?? null,
          senderEmail: email.sender_email ?? '',
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Could not link email'); setLinking(false); setPendingAction(null); return }
      toast.success(`Linked to ${formatRef(refInput.trim())}`)
      setLinking(false)
      onDone()
    }
    setPendingAction(null)
  }

  return (
    <>
      {showTypeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24, width: 300 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Who is this sender?</p>
            <p style={{ fontSize: 12, color: 'var(--es-n-400)', marginBottom: 16, wordBreak: 'break-all' }}>{email.sender_email}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => handleTypeSelected('client')} className="es-rbtn primary" style={{ flex: 1, justifyContent: 'center' }}>Client</button>
              <button onClick={() => handleTypeSelected('vendor')} className="es-rbtn" style={{ flex: 1, justifyContent: 'center', background: '#5B4EE8', color: 'white', borderColor: '#5B4EE8' }}>Vendor</button>
              <button onClick={() => setShowOtherInput(v => !v)} className="es-rbtn" style={{ flex: 1, justifyContent: 'center' }}>Other</button>
            </div>
            {showOtherInput && (
              <div style={{ marginBottom: 12 }}>
                <input
                  autoFocus
                  value={otherLabel}
                  onChange={e => setOtherLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && otherLabel.trim() && handleTypeSelected('other', otherLabel.trim())}
                  placeholder="e.g. Internal, Broker, Other…"
                  style={{ width: '100%', fontSize: 12, padding: '6px 8px', border: '1px solid var(--es-n-200)', borderRadius: 4, marginBottom: 8, boxSizing: 'border-box', color: 'var(--es-n-700)' }}
                />
                <button
                  onClick={() => handleTypeSelected('other', otherLabel.trim())}
                  disabled={!otherLabel.trim()}
                  className="es-rbtn primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Confirm
                </button>
              </div>
            )}
            <button onClick={() => { setShowTypeModal(false); setShowOtherInput(false); setOtherLabel(''); setPendingAction(null) }} style={{ width: '100%', fontSize: 11, color: 'var(--es-n-400)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
      <div className="es-triage-bar">
        <div className="es-triage-title">
          <AlertTriangle size={13} /> No case linked — triage this email
        </div>
        <div className="es-triage-row">
          <input
            placeholder="Ref number (e.g. 354830)"
            value={refInput}
            onChange={e => setRefInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && refInput.trim()) { setPendingAction('link'); setShowTypeModal(true) } }}
          />
          <button className="es-rbtn" onClick={() => { if (refInput.trim()) { setPendingAction('link'); setShowTypeModal(true) } }} disabled={linking || !refInput.trim()}>
            <Link2 size={12} /> {linking ? 'Linking…' : 'Link to case'}
          </button>
          <button className="es-rbtn primary" onClick={() => { if (refInput.trim()) { setPendingAction('create'); setShowTypeModal(true) } }} disabled={creating || !refInput.trim()}>
            <Plus size={12} /> {creating ? 'Creating…' : 'Create new case'}
          </button>
          <button className="es-rbtn" onClick={async () => {
            await nylasMove(email, 'SPAM')
            await supabase.from('email_messages').update({ folder: 'spam' }).eq('id', email.id)
            onDone()
          }}>
            <AlertOctagon size={12} /> Spam
          </button>
          <button className="es-rbtn" onClick={async () => {
            await nylasMove(email, 'TRASH')
            await supabase.from('email_messages').update({ folder: 'bin' }).eq('id', email.id)
            onDone()
          }}>
            <Trash2 size={12} /> Bin
          </button>
        </div>
      </div>
    </>
  )
}

// ── EmailDetail ───────────────────────────────────────────────────────────────

// SummaryData = ThreadSummaryStrip (imported from ThreadView)

export interface EmailDetailProps {
  email: EmailMessage
  onClose: () => void
  onAction: () => void
}

export default function EmailDetail({ email, onClose, onAction }: EmailDetailProps) {
  const [thread, setThread] = useState<EmailMessage[]>([])
  const [compose, setCompose] = useState<{ mode: 'reply' | 'replyAll' | 'forward' } | null>(null)
  const [caseInfo, setCaseInfo] = useState<ShipmentCase | null>(null)
  const [summary, setSummary] = useState<ThreadSummaryStrip | null>(null)

  // Load thread
  useEffect(() => {
    async function loadThread() {
      if (!email.nylas_thread_id) { setThread([]); return }
      const { data } = await supabase
        .from('email_messages').select('*')
        .eq('nylas_thread_id', email.nylas_thread_id)
        .order('created_at', { ascending: true })
      const msgs = (data || []) as EmailMessage[]
      setThread(msgs.length > 1 ? msgs : [])
    }
    loadThread()
  }, [email.id, email.nylas_thread_id])

  // Load case info + summary when case is linked
  const loadCaseData = useCallback(async () => {
    if (!email.case_id) { setCaseInfo(null); setSummary(null); return }
    const [caseRes, summaryRes] = await Promise.all([
      supabase.from('shipment_cases').select('*').eq('id', email.case_id).maybeSingle(),
      supabase.from('thread_summaries').select('summary_text,tone,open_questions,communication_risks')
        .eq('case_id', email.case_id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    setCaseInfo((caseRes.data as ShipmentCase | null) || null)
    setSummary(summaryRes.data || null)
  }, [email.case_id])

  useEffect(() => { loadCaseData() }, [loadCaseData])

  async function toggleStar() {
    await supabase.from('email_messages').update({ is_starred: !email.is_starred }).eq('id', email.id)
    onAction()
  }
  async function markSpam() {
    await nylasMove(email, 'SPAM')
    await supabase.from('email_messages').update({ folder: 'spam' }).eq('id', email.id)
    toast.success('Moved to spam')
    onAction(); onClose()
  }
  async function moveToBin() {
    await nylasMove(email, 'TRASH')
    await supabase.from('email_messages').update({ folder: 'bin', is_starred: false }).eq('id', email.id)
    toast.success('Moved to bin')
    onAction(); onClose()
  }

  const displayThread = thread.length > 1 ? thread : null
  const latestMsg = displayThread ? displayThread[displayThread.length - 1] : email
  const replySubject = email.subject?.startsWith('RE:') ? email.subject : `RE: ${email.subject || ''}`

  return (
    <div className="es-detail">
      {/* Send bar */}
      <div className="es-send-bar">
        <button className="es-send-btn" onClick={() => setCompose({ mode: 'reply' })}>
          <Send size={13} /> Reply
          <ChevronDown size={10} className="caret" />
        </button>
        <div className="es-from-chip">
          <span className="lbl">From:</span>
          <span className="addr">freightmate58@gmail.com</span>
          <ChevronDown size={11} style={{ color: 'var(--es-n-300)' }} />
        </div>
        <div className="es-bar-actions">
          <button title="Reply all" onClick={() => setCompose({ mode: 'replyAll' })}><ReplyAll size={14} /></button>
          <button title="Forward" onClick={() => setCompose({ mode: 'forward' })}><Forward size={14} /></button>
          <button
            title={email.is_starred ? 'Unstar' : 'Star'}
            onClick={toggleStar}
            style={email.is_starred ? { color: '#C99A00' } : {}}
          >
            <Star size={14} fill={email.is_starred ? 'currentColor' : 'none'} />
          </button>
          <button title="Spam" onClick={markSpam}><AlertOctagon size={14} /></button>
          <button title="Move to bin" onClick={moveToBin}><Trash2 size={14} /></button>
          <button title="Close" onClick={onClose}><X size={14} /></button>
        </div>
      </div>

      {/* Case context ribbon */}
      {caseInfo && (
        <div className="es-case-ribbon">
          <div className="es-cr-meta">
            <span className="k">Ref</span>
            <span className="es-ref-tag">#{caseInfo.ref_number || caseInfo.case_code}</span>
          </div>
          <div className="es-cr-meta">
            <span className="k">Client</span>
            <span className="v">{caseInfo.client_name || caseInfo.client_email}</span>
          </div>
          {caseInfo.origin && caseInfo.destination && (
            <div className="es-cr-meta">
              <span className="k">Lane</span>
              <span className="v" style={{ fontVariantNumeric: 'tabular-nums' }}>{caseInfo.origin} → {caseInfo.destination}</span>
            </div>
          )}
          {(caseInfo as any).flight && (
            <div className="es-cr-meta">
              <span className="k">Flight</span>
              <span className="v" style={{ fontVariantNumeric: 'tabular-nums' }}>{(caseInfo as any).flight}</span>
            </div>
          )}
          {caseInfo.weight_kg && (
            <div className="es-cr-meta">
              <span className="k">Weight</span>
              <span className="v" style={{ fontVariantNumeric: 'tabular-nums' }}>{caseInfo.weight_kg.toLocaleString()} kg</span>
            </div>
          )}
          {caseInfo.rate_amount && (
            <div className="es-cr-meta">
              <span className="k">Rate</span>
              <span className="v" style={{ fontVariantNumeric: 'tabular-nums' }}>{caseInfo.rate_currency} {caseInfo.rate_amount.toLocaleString()}</span>
            </div>
          )}
          <span className={`es-pill ${statusPillClass(caseInfo.status)}`}>{statusLabel(caseInfo.status)}</span>
          {(caseInfo as any).priority === 'urgent' && <span className="es-pill urgent">Urgent</span>}
          <Link href={`/cases/${caseInfo.ref_number || caseInfo.id}`} className="es-open-wb">
            Open in Workbench <ChevronRight size={11} />
          </Link>
        </div>
      )}

      {/* Triage block (unmatched only) */}
      {!email.case_id && (
        <TriageBlock email={email} onDone={() => { onAction(); loadCaseData() }} />
      )}

      {/* Persona clarification (unmatched + unknown sender) */}
      {!email.case_id && (
        <PersonaBlock email={email} onDone={onAction} />
      )}

      {/* Recipient + subject rows */}
      <div className="es-recipient-row">
        <span className="lbl">To</span>
        <div>
          <span className="es-chip">
            {latestMsg.sender_email}
            <span style={{ cursor: 'pointer', display: 'grid', placeItems: 'center', width: 16, height: 16 }}><X size={10} /></span>
          </span>
        </div>
        <div className="es-cc-bcc">
          <span>Cc</span><span>Bcc</span>
        </div>
      </div>

      <div className="es-subject-row">
        <div className="es-subject-text">{replySubject}</div>
        <div className="es-draft-saved">
          Draft saved at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>

      {/* Thread scroll — shared ThreadView component */}
      <ThreadView
        messages={displayThread || []}
        singleEmail={!displayThread ? email : undefined}
        summary={summary}
        onReply={(mode) => setCompose({ mode })}
      />

      {/* Inline reply / forward */}
      {compose && (
        <InlineReply
          mode={compose.mode}
          replyTo={latestMsg}
          onSent={() => { setCompose(null); onAction() }}
          onDiscard={() => setCompose(null)}
        />
      )}
    </div>
  )
}
