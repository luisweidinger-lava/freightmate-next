'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, Circle, Clock, Loader2, ChevronRight } from 'lucide-react'

const STEPS = [
  { n: 1, title: 'Microsoft Identity',   subtitle: 'Verify your work account',          automated: true  },
  { n: 2, title: 'Mailbox Connection',   subtitle: 'Connect your Outlook inbox',         automated: true  },
  { n: 3, title: 'Data Transparency',   subtitle: 'Review what Nexio will access',       automated: false },
  { n: 4, title: 'Email Ingestion',      subtitle: 'Importing your historical emails',   automated: true  },
  { n: 5, title: 'Contact & Case Review', subtitle: 'Review AI-classified contacts and cases', automated: false },
  { n: 6, title: 'All done',             subtitle: 'Your workspace is ready',             automated: false },
]

export default function OnboardingStep() {
  const params = useParams()
  const router = useRouter()
  const step   = Number(params.n)

  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string; name?: string } } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  if (!STEPS.find(s => s.n === step)) {
    router.replace('/onboarding/step/1')
    return null
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
      {/* Left sidebar — step list */}
      <aside style={{
        width: '260px', flexShrink: 0,
        background: '#0F172A',
        display: 'flex', flexDirection: 'column',
        padding: '36px 24px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <div className="ob-logo font-display" style={{ width: '32px', height: '32px', fontSize: '15px', borderRadius: '8px' }}>N</div>
          <span className="font-display" style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '16px' }}>Nexio</span>
        </div>

        {/* Steps */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {STEPS.map(s => {
            const isDone    = s.n < step
            const isActive  = s.n === step
            const isPending = s.n > step
            return (
              <div
                key={s.n}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(91, 78, 232, 0.18)' : 'transparent',
                  opacity: isPending ? 0.4 : 1,
                }}
              >
                <div style={{ marginTop: '1px', flexShrink: 0 }}>
                  {isDone
                    ? <CheckCircle2 size={16} color="#5B4EE8" strokeWidth={2} />
                    : isActive
                    ? <Circle size={16} color="#5B4EE8" strokeWidth={2.5} />
                    : <Circle size={16} color="#475569" strokeWidth={1.5} />
                  }
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#F8FAFC' : '#94A3B8' }}>
                    {s.title}
                  </div>
                  {isActive && (
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{s.subtitle}</div>
                  )}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User info at bottom */}
        {user && (
          <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, color: '#CBD5E1' }}>
                {user.user_metadata?.full_name || user.user_metadata?.name || 'Account'}
              </div>
              <div style={{ marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: '560px' }}>
          {/* Progress bar */}
          <div className="ob-progress" style={{ marginBottom: '32px' }}>
            {STEPS.map(s => (
              <div
                key={s.n}
                className={`ob-progress-step ${s.n < step ? 'done' : s.n === step ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Step content */}
          {step === 1 && <Step1 user={user} onNext={() => router.push('/onboarding/step/2')} />}
          {step === 2 && <Step2 onNext={() => router.push('/onboarding/step/3')} />}
          {step === 3 && <Step3 onNext={() => router.push('/onboarding/step/4')} />}
          {step === 4 && <Step4 onNext={() => router.push('/onboarding/step/5')} />}
          {step === 5 && <Step5 onNext={() => router.push('/onboarding/step/6')} />}
          {step === 6 && <Step6 />}
        </div>
      </main>
    </div>
  )
}

/* ── Step 1: Identity confirmed ───────────────────────────────────────────── */
function Step1({ user, onNext }: { user: any; onNext: () => void }) {
  useEffect(() => {
    // User arrived here after OAuth; advance automatically after a moment
    if (user) {
      const t = setTimeout(onNext, 1200)
      return () => clearTimeout(t)
    }
  }, [user, onNext])

  return (
    <div className="ob-card" style={{ textAlign: 'center' }}>
      <CheckCircle2 size={40} color="#5B4EE8" style={{ margin: '0 auto 16px' }} />
      <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>Identity verified</h2>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px 0' }}>
        Signed in as <strong>{user?.email ?? '…'}</strong>
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#6B7280', fontSize: '13px' }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        Continuing to mailbox setup…
      </div>
    </div>
  )
}

/* ── Step 2: Mailbox connection ───────────────────────────────────────────── */
function Step2({ onNext }: { onNext: () => void }) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function connect() {
    setStatus('connecting')
    // TODO: trigger Nylas OAuth flow via /api/onboarding/connect-mailbox
    // For now, simulate success after a delay for UI demonstration
    setTimeout(() => setStatus('connected'), 2000)
  }

  return (
    <div className="ob-card">
      <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>Connect your mailbox</h2>
      <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 28px 0' }}>
        Nexio connects to your Outlook inbox via Nylas to read and organise your shipment emails.
      </p>

      {status === 'idle' && (
        <button className="ob-btn-microsoft" onClick={connect}>
          <MsIcon /> Connect Outlook
        </button>
      )}

      {status === 'connecting' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', color: '#6B7280', fontSize: '14px' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#5B4EE8' }} />
          Connecting to Outlook…
        </div>
      )}

      {status === 'connected' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
            <CheckCircle2 size={18} color="#16A34A" />
            <span style={{ fontSize: '14px', color: '#15803D', fontWeight: 500 }}>Mailbox connected successfully</span>
          </div>
          <button className="ob-btn-primary" onClick={onNext}>
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {status === 'error' && (
        <>
          <div className="ob-error" style={{ marginBottom: '16px' }}>{errorMsg}</div>
          <button className="ob-btn-ghost" onClick={() => setStatus('idle')}>Try again</button>
        </>
      )}

      <ItBlockerNotice />
    </div>
  )
}

/* ── Step 3: Transparency & Consent ──────────────────────────────────────── */
function Step3({ onNext }: { onNext: () => void }) {
  const [agreed, setAgreed] = useState(false)
  const [months, setMonths] = useState(6)

  const MONTHS_OPTIONS = [1, 3, 6, 12, 18, 24]
  const EMAIL_ESTIMATES: Record<number, string> = {
    1: '~200–400 emails · ~5 min', 3: '~600–1 200 emails · ~12 min',
    6: '~1 200–2 400 emails · ~22 min', 12: '~2 400–4 800 emails · ~40 min',
    18: '~3 600–7 200 emails · ~55 min', 24: '~4 800–9 600 emails · ~70 min',
  }

  const DATA_SECTIONS = [
    { title: 'Emails', body: 'Fetched from Outlook via Nylas. Stored encrypted in Supabase (EU region, Frankfurt). Nexio reads email headers and body text to build shipment cases.' },
    { title: 'Contacts', body: 'Extracted from To / From / CC email headers. Classified as client, vendor, internal, or unknown. Never shared externally.' },
    { title: 'AI processing', body: 'Only email subjects and 200-character previews are sent to AI models. Full email body text never leaves Supabase.' },
    { title: 'Data residency', body: 'All data is stored in EU data centres. Nylas EU endpoint: api.eu.nylas.com. Supabase EU project.' },
    { title: 'Your rights', body: 'You may request a full export or deletion of all your data at any time from Settings → Account → Delete Account.' },
  ]

  return (
    <div className="ob-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>Data transparency</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Read what Nexio accesses and where your data is stored.</p>
      </div>

      {/* Accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {DATA_SECTIONS.map(s => (
          <DataAccordion key={s.title} title={s.title} body={s.body} />
        ))}
      </div>

      {/* Month range */}
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '10px' }}>
          How far back should Nexio analyse your emails?
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MONTHS_OPTIONS.map(m => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                border: months === m ? '1.5px solid #5B4EE8' : '1px solid #D1D5DB',
                background: months === m ? '#EEECFF' : 'white',
                color: months === m ? '#3730A3' : '#374151',
                transition: 'all 120ms',
              }}
            >
              {m} {m === 1 ? 'month' : 'months'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Clock size={12} /> {EMAIL_ESTIMATES[months]}
        </p>
      </div>

      {/* Agree */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '2px', accentColor: '#5B4EE8', width: '15px', height: '15px', flexShrink: 0 }} />
        I have read and agree to the Nexio Data Charter. I understand that my email data will be stored in EU data centres for the purpose of shipment coordination.
      </label>

      <button className="ob-btn-primary" disabled={!agreed} onClick={onNext}>
        Start importing emails <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* ── Step 4: Email ingestion ──────────────────────────────────────────────── */
function Step4({ onNext }: { onNext: () => void }) {
  const [progress, setProgress] = useState(0)
  const [fetched, setFetched]   = useState(0)
  const estimated = 2800

  useEffect(() => {
    // TODO: poll /api/onboarding/ingest for real progress
    // Simulated progress for UI demonstration
    const interval = setInterval(() => {
      setFetched(prev => {
        const next = Math.min(prev + Math.floor(Math.random() * 40 + 10), estimated)
        setProgress(Math.round((next / estimated) * 100))
        if (next >= estimated) clearInterval(interval)
        return next
      })
    }, 120)
    return () => clearInterval(interval)
  }, [])

  const isDone = fetched >= estimated

  return (
    <div className="ob-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>Importing your emails</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          This may take up to {'{estimated time}'} minutes. You can safely close this tab — the import will continue.
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
          <span>Fetching emails…</span>
          <span>{fetched.toLocaleString()} / ~{estimated.toLocaleString()}</span>
        </div>
        <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#5B4EE8', borderRadius: '3px', transition: 'width 200ms ease' }} />
        </div>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>{progress}% complete</p>
      </div>

      {/* Status items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <StatusRow label="Email fetch" done={fetched > 0} active={fetched > 0 && !isDone} />
        <StatusRow label="Storing messages" done={isDone} active={fetched > estimated * 0.5 && !isDone} />
        <StatusRow label="Preparing contact analysis" done={false} active={isDone} />
      </div>

      {isDone && (
        <button className="ob-btn-primary" onClick={onNext}>
          Review contacts & cases <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}

/* ── Step 5: Contact & case review ───────────────────────────────────────── */
function Step5({ onNext }: { onNext: () => void }) {
  return (
    <div className="ob-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>Review contacts & cases</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          The AI has classified your contacts and reconstructed shipment cases. Review and confirm before entering Nexio.
        </p>
      </div>

      <div style={{ padding: '20px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', textAlign: 'center' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF', margin: '0 auto 10px' }} />
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          Waiting for AI classification to complete…
        </p>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
          This step is handled by the Nexio onboarding team. Your technical supervisor will guide you through this step.
        </p>
      </div>

      <button className="ob-btn-primary" onClick={onNext} style={{ opacity: 0.5, cursor: 'not-allowed' }} disabled>
        Complete review <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* ── Step 6: Done ─────────────────────────────────────────────────────────── */
function Step6() {
  const router = useRouter()

  async function enterNexio() {
    await fetch('/api/onboarding/complete', { method: 'POST' })
    router.replace('/dashboard')
  }

  return (
    <div className="ob-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <CheckCircle2 size={48} color="#5B4EE8" />
      <div>
        <h2 className="font-display" style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' }}>Your workspace is ready</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          All emails imported, contacts classified, and cases seeded. You're ready to start working in Nexio.
        </p>
      </div>
      <button className="ob-btn-primary" style={{ maxWidth: '240px' }} onClick={enterNexio}>
        Enter Nexio <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* ── Small shared components ──────────────────────────────────────────────── */

function DataAccordion({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: '7px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '11px 14px', background: 'white', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{title}</span>
        <ChevronRight size={14} color="#9CA3AF" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div style={{ padding: '0 14px 12px', fontSize: '13px', color: '#6B7280', lineHeight: 1.6, borderTop: '1px solid #F3F4F6' }}>
          {body}
        </div>
      )}
    </div>
  )
}

function StatusRow({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
      {done
        ? <CheckCircle2 size={15} color="#16A34A" />
        : active
        ? <Loader2 size={15} color="#5B4EE8" style={{ animation: 'spin 1s linear infinite' }} />
        : <Circle size={15} color="#D1D5DB" />
      }
      <span style={{ color: done ? '#15803D' : active ? '#374151' : '#9CA3AF' }}>{label}</span>
    </div>
  )
}

function MsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  )
}

function ItBlockerNotice() {
  return (
    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '16px', lineHeight: 1.5 }}>
      If your organisation blocks third-party app access, your IT administrator must approve Nexio in Azure AD before you can connect.{' '}
      <a href="#" style={{ color: '#5B4EE8', textDecoration: 'none' }}>IT admin guide →</a>
    </p>
  )
}
