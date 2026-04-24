'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, HelpCircle, Settings } from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import SettingsModal from './SettingsModal'

export default function TitleBar() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim()) {
      router.push(ROUTES.CASES + '?q=' + encodeURIComponent(value.trim()))
      setValue('')
    }
  }

  return (
    <div className="es-title-bar">
      <div className="es-logo" aria-hidden>N</div>
      <span className="es-app-name">Nexio</span>

      <div className="es-search">
        <Search size={12} />
        <input
          placeholder="Search cases, emails, contacts, AWBs…"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="es-actions">
        <button title="Notifications"><Bell size={14} /></button>
        <button title="Help"><HelpCircle size={14} /></button>
        <button title="Settings" onClick={() => setSettingsOpen(true)}><Settings size={14} /></button>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
