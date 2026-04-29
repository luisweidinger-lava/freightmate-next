'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type User = { email?: string; user_metadata?: { full_name?: string; name?: string } }

type UserContextValue = {
  user: User | null
  role: string
}

const UserContext = createContext<UserContextValue>({ user: null, role: 'operator' })

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserContextValue>({ user: null, role: 'operator' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      fetch('/api/me')
        .then(r => r.json())
        .then(d => setState({ user: data.user, role: d.role ?? 'operator' }))
    })
  }, [])

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>
}
