/**
 * apply-schema.mjs
 * Applies supabase/schema.sql using the Supabase PostgreSQL REST API.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node supabase/apply-schema.mjs
 *   — or — have a .env file and run: node -r dotenv/config supabase/apply-schema.mjs
 */
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

// Extract project ref from URL: https://<ref>.supabase.co
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

function httpPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body)
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
    }, (res) => {
      let b = ''
      res.on('data', c => b += c)
      res.on('end', () => resolve({ status: res.statusCode, body: b }))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

console.log('📦 Applying schema.sql to Supabase...')
console.log(`   Project: ${PROJECT_REF}`)
console.log(`   URL: ${SUPABASE_URL}\n`)

const res = await httpPost(
  'api.supabase.com',
  `/v1/projects/${PROJECT_REF}/database/query`,
  { Authorization: `Bearer ${SERVICE_KEY}`, apiKey: SERVICE_KEY },
  { query: sql }
)

console.log('Status:', res.status)
if (res.status === 200 || res.status === 201) {
  console.log('✅ Schema applied successfully!')
} else {
  console.log('Response:', res.body.slice(0, 500))
  console.log('\n💡 If the Management API is not available, please:')
  console.log('   1. Go to https://supabase.com/dashboard')
  console.log('   2. Open your project → SQL Editor')
  console.log('   3. Paste the contents of supabase/schema.sql and click Run')
}
