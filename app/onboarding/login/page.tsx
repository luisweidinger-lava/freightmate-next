'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); return }
      router.refresh()
      router.replace('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile openid',
        redirectTo: `${window.location.origin}/onboarding/step/1`,
      },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  async function handleMicrosoftLogin() {
    setError(null)
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid',
        redirectTo: `${window.location.origin}/onboarding/step/1`,
      },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-full">
      <div className="login-overlay" />

      <div className="login-content">

        {/* ── Login panel (left) ── */}
        <div className="login-panel-pos">
          <div className="ob-card-dark">

            {/* Logo + title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '28px', textAlign: 'center' }}>
              <NexioLogo />
              <div>
                <h1 className="font-display" style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                  Welcome back
                </h1>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '5px 0 0 0' }}>
                  Sign in to your Nexio account
                </p>
              </div>
            </div>

            {/* Google */}
            <button className="ob-btn-google" onClick={handleGoogleLogin} disabled={loading}>
              <GoogleIcon />
              Sign in with Google
            </button>

            {/* Microsoft */}
            <button
              className="ob-btn-microsoft"
              onClick={handleMicrosoftLogin}
              disabled={loading}
              style={{ marginTop: '10px' }}
            >
              <MicrosoftIcon />
              Sign in with Microsoft
            </button>

            {/* Divider */}
            <div className="ob-divider" style={{ margin: '20px 0' }}>or</div>

            {/* Email / password */}
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>Email</label>
                <input
                  className="ob-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>Password</label>
                <input
                  className="ob-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && <div className="ob-error">{error}</div>}

              <button
                type="submit"
                className="ob-btn-ghost"
                disabled={loading || !email || !password}
                style={{ marginTop: '2px', fontSize: '13px' }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', marginTop: '20px', lineHeight: 1.5 }}>
              Account access is by invitation only.
            </p>

          </div>
        </div>

        {/* ── Right-side branding ── */}
        <div className="login-brand-pos">
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
            margin: '0 0 16px 0',
          }}>
            Freight Forwarding Platform
          </p>
          <h2 style={{
            fontSize: 'clamp(32px, 3.4vw, 52px)',
            fontWeight: 800,
            color: 'white',
            margin: 0,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            fontFamily: "'Bricolage Grotesque', sans-serif",
            textShadow: '0 2px 32px rgba(0,0,0,0.5)',
          }}>
            Nexio — The Nexus of<br />Freight Forwarding Logistics
          </h2>
        </div>

      </div>
    </div>
  )
}

function NexioLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="nexio-g" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#5B4EE8" />
          </linearGradient>
        </defs>
        <rect width="52" height="52" rx="13" fill="url(#nexio-g)" />
        <path d="M15 37V15L37 37V15" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="26" cy="26" r="2.8" fill="white" fillOpacity="0.55" />
      </svg>
      <span style={{
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: '#111827',
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}>
        nexio
      </span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}
