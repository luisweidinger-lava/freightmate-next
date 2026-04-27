'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Middleware handles all auth/onboarding routing.
// This root page simply redirects to avoid a blank flash.
export default function RootPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [router])
  return null
}
