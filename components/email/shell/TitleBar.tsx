'use client'

import { Search, Bell, HelpCircle, Settings } from 'lucide-react'

export default function TitleBar() {
  return (
    <div className="es-title-bar">
      <div className="es-logo" aria-hidden>F</div>
      <span className="es-app-name">FreightMate</span>

      <div className="es-search">
        <Search size={12} />
        <input placeholder="Search cases, emails, contacts, AWBs…" readOnly />
      </div>

      <div className="es-actions">
        <button title="Notifications"><Bell size={14} /></button>
        <button title="Help"><HelpCircle size={14} /></button>
        <button title="Settings"><Settings size={14} /></button>
      </div>
    </div>
  )
}
