'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { MessageDraft } from './types'

interface ComposeState {
  draft?: MessageDraft
}

interface ComposeContextValue {
  composeState: ComposeState | null
  open: (draft?: MessageDraft) => void
  close: () => void
}

const ComposeContext = createContext<ComposeContextValue>({
  composeState: null,
  open: () => {},
  close: () => {},
})

export function ComposeProvider({ children }: { children: ReactNode }) {
  const [composeState, setComposeState] = useState<ComposeState | null>(null)

  return (
    <ComposeContext.Provider value={{
      composeState,
      open:  (draft?) => setComposeState({ draft }),
      close: ()       => setComposeState(null),
    }}>
      {children}
    </ComposeContext.Provider>
  )
}

export const useCompose = () => useContext(ComposeContext)
