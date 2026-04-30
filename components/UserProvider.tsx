'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type User = { id?: string; email?: string; user_metadata?: { full_name?: string; name?: string } }

type UserContextValue = {
  user: User | null
  role: string
  loaded: boolean
}

const UserContext = createContext<UserContextValue>({ user: null, role: 'operator', loaded: false })

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserContextValue>({ user: null, role: 'operator', loaded: false })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { setState(s => ({ ...s, loaded: true })); return }
      fetch('/api/me')
        .then(r => r.json())
        .then(d => setState({ user: data.user, role: d.role ?? 'operator', loaded: true }))
    })
  }, [])

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>
}
