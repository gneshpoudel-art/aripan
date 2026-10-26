/**
 * Diagnostic + password reset script for admin user.
 * Run with: npx tsx scripts/reset-admin.ts
 */
import { config as loadEnv } from 'dotenv'
loadEnv()

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@aripan.art'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env')
  process.exit(1)
}
if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD missing in .env')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('\nConnecting to Supabase:', SUPABASE_URL)
  console.log('Admin email:', ADMIN_EMAIL, '| Password length:', ADMIN_PASSWORD.length, '\n')

  // 1 — Check table & existing user
  const { data: existing, error: selectErr } = await sb
    .from('admin_users')
    .select('id, email, role')
    .eq('email', ADMIN_EMAIL.toLowerCase())
    .maybeSingle()

  if (selectErr) {
    console.error('ERROR reading admin_users:', selectErr.message)
    console.log('The table may not exist. Run supabase/schema.sql in the Supabase SQL editor first.')
    process.exit(1)
  }

  if (existing) {
    console.log('Found existing admin user:', existing)
  } else {
    console.log('No admin user found — will create one.')
  }

  // 2 — Hash and self-test
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12)
  const selfTest = bcrypt.compareSync(ADMIN_PASSWORD, hash)
  if (!selfTest) { console.error('bcrypt self-test FAILED'); process.exit(1) }
  console.log('bcrypt self-test passed.')

  // 3 — Upsert
  const { data: upserted, error: upsertErr } = await sb
    .from('admin_users')
    .upsert(
      { id: 'admin-1', email: ADMIN_EMAIL.toLowerCase(), password_hash: hash, role: 'super_admin', updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    )
    .select()

  if (upsertErr) {
    console.error('Upsert failed:', upsertErr.message, upsertErr)
    // Try DELETE + INSERT as fallback
    await sb.from('admin_users').delete().eq('email', ADMIN_EMAIL.toLowerCase())
    const { error: insertErr } = await sb.from('admin_users').insert(
      { id: 'admin-1', email: ADMIN_EMAIL.toLowerCase(), password_hash: hash, role: 'super_admin' }
    )
    if (insertErr) { console.error('INSERT also failed:', insertErr.message); process.exit(1) }
    console.log('Inserted via fallback.')
  } else {
    console.log('Upserted:', upserted)
  }

  // 4 — End-to-end verify
  const { data: verify, error: verifyErr } = await sb
    .from('admin_users').select('id, email, role, password_hash')
    .eq('email', ADMIN_EMAIL.toLowerCase()).maybeSingle()

  if (verifyErr || !verify) { console.error('Read-back failed:', verifyErr?.message); process.exit(1) }

  const loginOk = bcrypt.compareSync(ADMIN_PASSWORD, verify.password_hash)
  if (!loginOk) { console.error('Password verification FAILED — hash mismatch!'); process.exit(1) }

  console.log('\nSUCCESS — admin credentials verified end-to-end.')
  console.log('----------------------------------------')
  console.log('  Email:   ', ADMIN_EMAIL)
  console.log('  Password:', ADMIN_PASSWORD)
  console.log('----------------------------------------\n')
}

run().catch((err) => { console.error('Unhandled:', err); process.exit(1) })
