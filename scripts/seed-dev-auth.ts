/**
 * One-time setup script for the freightmate58@gmail.com test account.
 *
 * What it does:
 *   1. Creates a Supabase Auth email+password user for freightmate58@gmail.com
 *   2. Upserts an app_users row with onboarding_complete = true, linked to the
 *      existing mailboxes row (identified by the NYLAS_GRANT_ID env var).
 *
 * Run once after applying the onboarding migration:
 *   DEV_PASSWORD=<choose-a-password> npx tsx scripts/seed-dev-auth.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey     = process.env.SUPABASE_SERVICE_ROLE_KEY!
const devPassword        = process.env.DEV_PASSWORD
const testEmail          = 'freightmate58@gmail.com'

if (!devPassword) {
  console.error('Set DEV_PASSWORD env var before running this script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  // 1. Create or fetch the auth user
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users.find(u => u.email === testEmail)

  let userId: string

  if (existing) {
    userId = existing.id
    console.log(`Auth user already exists: ${userId}`)
    // Update password in case it changed
    await supabase.auth.admin.updateUserById(userId, { password: devPassword })
    console.log('Password updated.')
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email:          testEmail,
      password:       devPassword,
      email_confirm:  true,
    })
    if (error || !data.user) {
      console.error('Failed to create auth user:', error?.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log(`Auth user created: ${userId}`)
  }

  // 2. Find the existing mailboxes row
  const { data: mailbox, error: mbError } = await supabase
    .from('mailboxes')
    .select('id')
    .limit(1)
    .single()

  if (mbError || !mailbox) {
    console.warn('No mailboxes row found — app_users.mailbox_id will be NULL.')
    console.warn('Run the app and connect a mailbox first, or seed the mailboxes table.')
  }

  // 3. Upsert app_users row
  const { error: upsertError } = await supabase
    .from('app_users')
    .upsert({
      id:                  userId,
      mailbox_id:          mailbox?.id ?? null,
      onboarding_complete: true,
      onboarding_step:     6,
    })

  if (upsertError) {
    console.error('Failed to upsert app_users:', upsertError.message)
    process.exit(1)
  }

  console.log(`app_users row upserted for ${testEmail} (onboarding_complete = true)`)
  console.log('\nDone. You can now log in at /onboarding/login with:')
  console.log(`  Email:    ${testEmail}`)
  console.log(`  Password: ${devPassword}`)
}

main()
