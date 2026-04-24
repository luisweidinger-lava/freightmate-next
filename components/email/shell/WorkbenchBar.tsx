'use client'

import Link from 'next/link'
import { Briefcase, FolderOpen } from 'lucide-react'

export default function WorkbenchBar() {
  return (
    <div className="es-workbench-bar">
      <Briefcase size={13} strokeWidth={1.5} style={{ color: 'var(--es-n-500)', flexShrink: 0 }} />
      <span style={{ fontWeight: 600, color: 'var(--es-n-700)', fontSize: 12 }}>Workbench</span>
      <div style={{ flex: 1 }} />
      <Link href="/cases" className="es-wb-bar-link">
        <FolderOpen size={12} strokeWidth={1.5} />
        All Cases
      </Link>
    </div>
  )
}
