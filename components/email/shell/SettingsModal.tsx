'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface Props { onClose: () => void }

const SECTIONS = [
  'General', 'Notifications', 'Display', 'Email', 'Account', 'About',
] as const
type Section = typeof SECTIONS[number]

function load(key: string, fallback: string): string {
  try { return localStorage.getItem('fm_settings_' + key) ?? fallback } catch { return fallback }
}
function save(key: string, val: string) {
  try { localStorage.setItem('fm_settings_' + key, val) } catch { /* ignore */ }
}

export default function SettingsModal({ onClose }: Props) {
  const [section, setSection] = useState<Section>('General')

  // General
  const [displayName, setDisplayName] = useState(() => load('display_name', ''))
  const [timezone,    setTimezone]    = useState(() => load('timezone', 'UTC'))

  // Notifications
  const [unreadBadge,    setUnreadBadge]    = useState(() => load('unread_badge', 'true') === 'true')
  const [desktopNotifs,  setDesktopNotifs]  = useState(() => load('desktop_notifs', 'false') === 'true')
  const [soundOnEmail,   setSoundOnEmail]   = useState(() => load('sound_on_email', 'false') === 'true')

  // Display
  const [density,      setDensity]      = useState(() => load('density', 'Normal'))
  const [readingPane,  setReadingPane]  = useState(() => load('reading_pane', 'Right'))

  // Email
  const [syncInterval, setSyncInterval] = useState(() => load('sync_interval', 'Every 15 min'))
  const [signature,    setSignature]    = useState(() => load('signature', ''))

  // Persist helpers
  const p = useCallback(<T extends string | boolean>(key: string, setter: (v: T) => void) =>
    (val: T) => { setter(val); save(key, String(val)) }, [])

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', padding: 2,
          background: checked ? 'var(--es-brand)' : 'var(--es-n-200)',
          display: 'flex', alignItems: 'center', transition: 'background 0.15s',
        }}
      >
        <span style={{
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          display: 'block', transition: 'transform 0.15s',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
        }} />
      </button>
    )
  }

  function renderSection() {
    switch (section) {
      case 'General':
        return (
          <div className="es-sm-section">
            <div className="es-sm-field">
              <label>Display name</label>
              <input
                type="text" value={displayName}
                onChange={e => p<string>('display_name', setDisplayName)(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="es-sm-field">
              <label>Timezone</label>
              <select value={timezone} onChange={e => p<string>('timezone', setTimezone)(e.target.value)}>
                <option>UTC</option>
                <option>Europe/Berlin</option>
                <option>America/Chicago</option>
              </select>
            </div>
            <div className="es-sm-field">
              <label>Language</label>
              <select disabled><option>English</option></select>
            </div>
          </div>
        )
      case 'Notifications':
        return (
          <div className="es-sm-section">
            <div className="es-sm-row">
              <span>Unread badge on tab title</span>
              <Toggle checked={unreadBadge} onChange={p<boolean>('unread_badge', setUnreadBadge)} />
            </div>
            <div className="es-sm-row">
              <span>Desktop notifications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Toggle checked={desktopNotifs} onChange={p<boolean>('desktop_notifs', setDesktopNotifs)} />
                <button className="es-rbtn" style={{ fontSize: 11, height: 24, padding: '0 8px' }}
                  onClick={() => Notification.requestPermission()}>
                  Request permission
                </button>
              </div>
            </div>
            <div className="es-sm-row">
              <span>Sound on new email</span>
              <Toggle checked={soundOnEmail} onChange={p<boolean>('sound_on_email', setSoundOnEmail)} />
            </div>
          </div>
        )
      case 'Display':
        return (
          <div className="es-sm-section">
            <div className="es-sm-field">
              <label>List density</label>
              <div className="es-sm-radios">
                {['Compact','Normal','Comfortable'].map(v => (
                  <label key={v} className="es-sm-radio">
                    <input type="radio" name="density" value={v} checked={density === v}
                      onChange={() => p<string>('density', setDensity)(v)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="es-sm-field">
              <label>Reading pane</label>
              <div className="es-sm-radios">
                {['Right','Bottom'].map(v => (
                  <label key={v} className="es-sm-radio">
                    <input type="radio" name="reading_pane" value={v} checked={readingPane === v}
                      onChange={() => p<string>('reading_pane', setReadingPane)(v)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )
      case 'Email':
        return (
          <div className="es-sm-section">
            <div className="es-sm-field">
              <label>Auto-sync interval</label>
              <div className="es-sm-radios">
                {['Manual','Every 5 min','Every 15 min'].map(v => (
                  <label key={v} className="es-sm-radio">
                    <input type="radio" name="sync_interval" value={v} checked={syncInterval === v}
                      onChange={() => p<string>('sync_interval', setSyncInterval)(v)} />
                    {v}
                  </label>
                ))}
              </div>
            </div>
            <div className="es-sm-field" style={{ flex: 1 }}>
              <label>Signature</label>
              <textarea
                value={signature}
                onChange={e => p<string>('signature', setSignature)(e.target.value)}
                placeholder="Your email signature…"
                rows={5}
              />
            </div>
          </div>
        )
      case 'Account':
        return (
          <div className="es-sm-section">
            <div className="es-sm-field">
              <label>Connected mailbox</label>
              <span className="es-sm-chip">freightmate58@gmail.com</span>
            </div>
            <div className="es-sm-field">
              <label>Nylas connection</label>
              <span className="es-sm-chip" style={{ color: 'var(--es-ok)', background: 'var(--es-ok-bg)', borderColor: 'var(--es-ok-bd)' }}>Connected</span>
            </div>
          </div>
        )
      case 'About':
        return (
          <div className="es-sm-section">
            <div className="es-sm-field">
              <label>Application</label>
              <span style={{ color: 'var(--es-n-700)', fontWeight: 600 }}>FreightMate 0.1 — AxisLog Next</span>
            </div>
            <div className="es-sm-field" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <label>Keyboard shortcuts</label>
              <table className="es-sm-shortcuts">
                <tbody>
                  {[
                    ['N', 'New message'],
                    ['R', 'Reply'],
                    ['F', 'Forward'],
                    ['Del', 'Move to bin'],
                    ['/', 'Focus search'],
                    ['Esc', 'Close panel / modal'],
                  ].map(([key, desc]) => (
                    <tr key={key}>
                      <td><kbd>{key}</kbd></td>
                      <td>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="es-sm-backdrop" onClick={onClose}>
      <div className="es-sm-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="es-sm-header">
          <span>Settings</span>
          <button onClick={onClose} className="es-sm-close"><X size={14} /></button>
        </div>

        <div className="es-sm-body">
          {/* Sidebar */}
          <div className="es-sm-nav">
            {SECTIONS.map(s => (
              <button
                key={s}
                className={`es-sm-nav-item${section === s ? ' active' : ''}`}
                onClick={() => setSection(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="es-sm-content">
            <div className="es-sm-content-title">{section}</div>
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}
