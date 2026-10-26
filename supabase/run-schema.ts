/**
 * run-schema.ts
 * One-time script: runs supabase/schema.sql against your Supabase instance.
 * Usage: npx tsx supabase/run-schema.ts
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

loadEnv()

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

// Split on semicolons and run each statement
const statements = sql
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith('--'))

console.log(`📦 Running ${statements.length} SQL statements against Supabase...`)

let ok = 0
let failed = 0

for (const stmt of statements) {
  try {
    const res = await supabase.rpc('exec_sql', { sql: stmt + ';' }).throwOnError()
    if (res.error) throw res.error
    ok++
  } catch (err) {
    // Supabase doesn't expose raw SQL exec via JS SDK by default.
    // If this fails, copy schema.sql into the Supabase SQL editor and run it there.
    const msg = (err as Error).message ?? String(err)
    if (msg.includes('already exists') || msg.includes('duplicate')) {
      ok++ // idempotent
    } else {
      console.error(`  ⚠ ${stmt.slice(0, 60)}... → ${msg}`)
      failed++
    }
  }
}

console.log(`\n✅ Done: ${ok} statements OK, ${failed} failed.`)
if (failed > 0) {
  console.log('\n💡 Tip: If exec_sql RPC is not available, paste the contents of supabase/schema.sql into the Supabase SQL editor and click Run.')
}
