/**
 * FreightMate — DB clear script
 * Run: npx tsx scripts/seed.ts
 *
 * Deletes ALL rows from every table. Use before live E2E testing so the
 * DB starts empty and cases are created only by real Gmail → WF1 → WF2.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function del(table: string) {
  const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) console.error(`  ✗ delete ${table}:`, error.message)
  else       console.log(`  ✓ cleared ${table}`)
}

async function cleanup() {
  console.log('\n🗑️  Clearing all data...\n')
  // Delete in dependency order (children first)
  await del('message_drafts')
  await del('draft_tasks')
  await del('thread_summaries')
  await del('shipment_events')
  await del('shipment_facts')
  await del('email_messages')
  await del('case_channels')
  await del('shipment_cases')
  await del('case_contacts')
  await del('clients')
  await del('vendors')
  await del('contacts')
  await del('mailboxes')
}

async function main() {
  console.log('\n🚀 FreightMate — clear all data\n')
  await cleanup()
  console.log('\n✅ All tables cleared. DB is empty and ready for live testing.\n')
}

main().catch(err => {
  console.error('\n❌ Failed:', err)
  process.exit(1)
})
