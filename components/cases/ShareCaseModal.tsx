'use client'

import { useEffect, useState } from 'react'
import { X, UserCheck, UserPlus, UserX, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/components/UserProvider'
import type { Profile, CaseAccessGrant } from '@/lib/types'

interface Props {
  caseId:    string
  caseRef:   string | null
  onClose:   () => void
  onChanged: () => void
}

type GrantStatus = 'granted' | 'pending' | 'revoked' | null

interface OrgMember extends Profile {
  grantStatus: GrantStatus
  grantId:     string | null
}

export function ShareCaseModal({ caseId, caseRef, onClose, onChanged }: Props) {
  const { user } = useUser()
  const [members,  setMembers]  = useState<OrgMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState<string | null>(null) // userId being actioned

  async function fetchData() {
    const [{ data: profiles }, { data: grants }] = await Promise.all([
      supabase.from('profiles').select('*').neq('id', user?.id ?? ''),
      supabase.from('case_access_grants').select('*').eq('case_id', caseId),
    ])

    const grantMap = new Map<string, CaseAccessGrant>()
    for (const g of grants ?? []) grantMap.set(g.manager_id, g)

    setMembers(
      (profiles ?? []).map(p => {
        const g = grantMap.get(p.id)
        return { ...p, grantStatus: (g?.status ?? null) as GrantStatus, grantId: g?.id ?? null }
      })
    )
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleShare(memberId: string) {
    setBusy(memberId)
    await fetch('/api/case-access/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, manager_id: memberId }),
    })
    await fetchData()
    onChanged()
    setBusy(null)
  }

  async function handleRevoke(grantId: string, memberId: string) {
    setBusy(memberId)
    await fetch('/api/case-access/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_id: grantId }),
    })
    await fetchData()
    onChanged()
    setBusy(null)
  }

  const activeMembers  = members.filter(m => m.grantStatus === 'granted' || m.grantStatus === 'pending')
  const otherMembers   = members.filter(m => m.grantStatus !== 'granted' && m.grantStatus !== 'pending')

  return (
    <div className="access-modal-overlay" onClick={onClose}>
      <div className="access-modal share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-modal-header">
          <div>
            <p className="access-modal-title">Share Case {caseRef ? `#${caseRef}` : ''}</p>
            <p className="access-modal-msg" style={{ marginTop: 2 }}>
              Grant colleagues read-only view access to this case.
            </p>
          </div>
          <button className="share-modal-close" onClick={onClose}><X size={15} strokeWidth={1.5} /></button>
        </div>

        {loading ? (
          <div className="share-modal-loading">
            <Loader2 size={16} strokeWidth={1.5} style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : members.length === 0 ? (
          <p className="share-modal-empty">No other users in your organisation.</p>
        ) : (
          <div className="share-modal-list">
            {activeMembers.length > 0 && (
              <>
                <p className="share-modal-section-label">Has access</p>
                {activeMembers.map(m => (
                  <MemberRow
                    key={m.id} member={m}
                    busy={busy === m.id}
                    onShare={() => handleShare(m.id)}
                    onRevoke={() => m.grantId && handleRevoke(m.grantId, m.id)}
                  />
                ))}
              </>
            )}
            {otherMembers.length > 0 && (
              <>
                <p className="share-modal-section-label">{activeMembers.length > 0 ? 'Add more' : 'Organisation members'}</p>
                {otherMembers.map(m => (
                  <MemberRow
                    key={m.id} member={m}
                    busy={busy === m.id}
                    onShare={() => handleShare(m.id)}
                    onRevoke={() => m.grantId && handleRevoke(m.grantId, m.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, busy, onShare, onRevoke }: {
  member:   OrgMember
  busy:     boolean
  onShare:  () => void
  onRevoke: () => void
}) {
  const { grantStatus } = member

  return (
    <div className="share-modal-member">
      <div className="share-modal-member-info">
        <span className="share-modal-member-name">{member.display_name ?? member.email}</span>
        <span className="share-modal-member-email">{member.display_name ? member.email : ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {grantStatus === 'granted' && (
          <span className="es-badge es-badge--green" style={{ fontSize: 10 }}>Access</span>
        )}
        {grantStatus === 'pending' && (
          <span className="es-badge es-badge--neutral" style={{ fontSize: 10 }}>Pending</span>
        )}
        {busy ? (
          <Loader2 size={13} strokeWidth={1.5} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--es-n-300)' }} />
        ) : grantStatus === 'granted' || grantStatus === 'pending' ? (
          <button className="share-modal-btn share-modal-btn--revoke" onClick={onRevoke} title="Revoke access">
            <UserX size={12} strokeWidth={1.5} /> Revoke
          </button>
        ) : (
          <button className="share-modal-btn share-modal-btn--share" onClick={onShare} title="Grant access">
            <UserPlus size={12} strokeWidth={1.5} /> Share
          </button>
        )}
      </div>
    </div>
  )
}
