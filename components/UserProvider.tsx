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

const UserContext = createContext<UserContextValue>({ user: null, role: 'operator', mailboxId: undefined, loaded: false })

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserContextValue>({ user: null, role: 'operator', mailboxId: undefined, loaded: false })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setState(s => ({ ...s, mailboxId: null, loaded: true })); return }
      const [meRes, appUserRes] = await Promise.all([
        fetch('/api/me').then(r => r.json()),
        supabase.from('app_users').select('mailbox_id').eq('id', data.user.id).single(),
      ])
      setState({
        user: data.user,
        role: meRes.role ?? 'operator',
        mailboxId: appUserRes.data?.mailbox_id ?? null,
        loaded: true,
      })
    })
  }, [])

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>
}
