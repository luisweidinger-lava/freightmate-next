'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function HomePage() {
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })

      if ((count ?? 0) === 0) {
        setShowOnboarding(true)
      } else {
        router.replace('/dashboard')
      }
      setChecking(false)
    }
    check()
  }, [router])

  if (checking) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => router.replace('/dashboard')}
          onSkip={() => router.replace('/dashboard')}
        />
      )}
    </>
  )
}
