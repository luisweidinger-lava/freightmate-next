'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'

const TABS = ['Home', 'View', 'Help', 'Message'] as const

export default function TabStrip() {
  const [active, setActive] = useState<string>('Message')

  return (
    <div className="es-tab-strip">
      {TABS.map(t => (
        <div
          key={t}
          className={`es-tab${active === t ? ' active' : ''}`}
          onClick={() => setActive(t)}
        >
          {t}
        </div>
      ))}
      <div className="es-calendar-chip">
        <Calendar size={13} />
        <span>Ops standup — 09:00</span>
      </div>
    </div>
  )
}
