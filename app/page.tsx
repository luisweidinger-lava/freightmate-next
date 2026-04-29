'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/onboarding/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      router.replace(profile?.role === 'manager' ? '/operations' : '/dashboard')
    })
  }, [router])
  return null
}
