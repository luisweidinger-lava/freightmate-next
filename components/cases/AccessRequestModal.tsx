'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import type { CaseAccessGrant } from '@/lib/types'

interface Props {
  grant:       CaseAccessGrant
  managerName: string
  caseRef:     string
  onGrant:     (note?: string) => void
  onReject:    (note?: string) => void
  onDismiss:   () => void
}

export function AccessRequestModal({ grant: _grant, managerName, caseRef, onGrant, onReject, onDismiss }: Props) {
  const [note, setNote] = useState('')

  return (
    <div className="access-modal-overlay">
      <div className="access-modal">
        <div className="access-modal-icon">
          <ShieldCheck size={20} strokeWidth={1.5} />
        </div>
        <div className="access-modal-body">
          <p className="access-modal-title">Access Request</p>
          <p className="access-modal-msg">
            <strong>{managerName}</strong> is requesting read-only access to case{' '}
            <strong>{caseRef}</strong>.
          </p>
        </div>
        <textarea
          className="access-modal-note"
          placeholder="Optional message to the requester…"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
        />
        <div className="access-modal-actions">
          <button className="access-modal-btn access-modal-btn--grant" onClick={() => onGrant(note || undefined)}>
            Approve
          </button>
          <button className="access-modal-btn access-modal-btn--reject" onClick={() => onReject(note || undefined)}>
            Reject
          </button>
          <button className="access-modal-btn access-modal-btn--dismiss" onClick={onDismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
