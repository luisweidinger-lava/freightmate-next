import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through: public assets, Next.js internals, API routes, nexio landing
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/nexio') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isOnboardingRoute = pathname.startsWith('/onboarding')

  if (!user) {
    if (!isOnboardingRoute) {
      return NextResponse.redirect(new URL('/onboarding/login', request.url))
    }
    return response
  }

  // Authenticated — check onboarding state
  const { data: appUser } = await supabase
    .from('app_users')
    .select('onboarding_complete, onboarding_step')
    .eq('id', user.id)
    .single()

  const isComplete = appUser?.onboarding_complete === true

  if (!isComplete) {
    if (!isOnboardingRoute || pathname === '/onboarding/login') {
      const step = appUser?.onboarding_step ?? 1
      return NextResponse.redirect(new URL(`/onboarding/step/${step}`, request.url))
    }
    return response
  }

  // Onboarding complete — block access to onboarding routes
  if (isOnboardingRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // /operations is manager-only
  if (pathname.startsWith('/operations')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
