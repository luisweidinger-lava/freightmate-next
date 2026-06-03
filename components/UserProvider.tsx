'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type User = { id?: string; email?: string; user_metadata?: { full_name?: string; name?: string } }

type UserContextValue = {
  user: User | null
  role: string
  mailboxId: string | null | undefined
  loaded: boolean
}

const ROLE_CACHE_KEY    = 'fm:role'
const MAILBOX_CACHE_KEY = 'fm:mailbox'

const UserContext = createContext<UserContextValue>({ user: null, role: 'operator', mailboxId: undefined, loaded: false })

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserContextValue>({ user: null, role: 'operator', mailboxId: undefined, loaded: false })

  useEffect(() => {
    const cachedRole    = localStorage.getItem(ROLE_CACHE_KEY)
    const cachedMailbox = localStorage.getItem(MAILBOX_CACHE_KEY)

    // Fast path: getSession() reads from local storage — no network round-trip.
    // If we already have a cached role, unblock the page immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && cachedRole) {
        setState({
          user: session.user,
          role: cachedRole,
          mailboxId: cachedMailbox ?? null,
          loaded: true,
        })
      }
    })

    // Secure background refresh: validates the JWT with the auth server and
    // re-fetches role + mailbox. Updates state when complete (may be a no-op
    // if nothing changed).
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        localStorage.removeItem(ROLE_CACHE_KEY)
        localStorage.removeItem(MAILBOX_CACHE_KEY)
        setState(s => ({ ...s, user: null, mailboxId: null, loaded: true }))
        return
      }
      const [meRes, appUserRes] = await Promise.all([
        fetch('/api/me').then(r => r.json()),
        supabase.from('app_users').select('mailbox_id').eq('id', data.user.id).single(),
      ])
      const role      = meRes.role ?? 'operator'
      const mailboxId = appUserRes.data?.mailbox_id ?? null
      localStorage.setItem(ROLE_CACHE_KEY, role)
      if (mailboxId) localStorage.setItem(MAILBOX_CACHE_KEY, mailboxId)
      else           localStorage.removeItem(MAILBOX_CACHE_KEY)
      setState({
        user: data.user,
        role,
        mailboxId,
        loaded: true,
      })
    })
  }, [])

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>
}
