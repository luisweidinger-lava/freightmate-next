'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Ribbon from './Ribbon'
import ComposePanel from '@/components/email/ComposePanel'
import { useCompose } from '@/lib/compose-context'

export default function ShellActions() {
  const [syncing, setSyncing] = useState(false)
  const { composeState, open, close } = useCompose()

  async function handleSync() {
    setSyncing(true)
    try {
      const res  = await fetch('/api/nylas-sync', { method: 'POST' })
      const data = await res.json()
      toast.success(`Synced ${data.synced ?? 0} messages`)
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <Ribbon
        onSync={handleSync}
        syncing={syncing}
        onNewMessage={() => open()}
      />
      {composeState && (
        <ComposePanel
          mode="compose"
          initialDraft={composeState.draft}
          onClose={close}
        />
      )}
    </>
  )
}
