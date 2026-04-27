import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient stores the session in cookies (not localStorage) so
// proxy.ts can read auth state server-side without a session mismatch.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
