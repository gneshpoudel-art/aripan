/**
 * apply-schema-direct.mjs
 * Applies schema.sql using the Supabase SQL REST API endpoint.
 * 
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node supabase/apply-schema-direct.mjs
 *   — or — have a .env file and run: node -r dotenv/config supabase/apply-schema-direct.mjs
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
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

function post(hostname, pathStr, headers, bodyStr) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path: pathStr, method: 'POST', port: 443,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      }
    }, (res) => {
      let b = ''
      res.on('data', c => b += c)
      res.on('end', () => resolve({ status: res.statusCode, body: b }))
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

console.log('Applying schema via Supabase Management API...\n')

const body = JSON.stringify({ query: schema })

const res = await post(
  'api.supabase.com',
  `/v1/projects/${PROJECT_REF}/database/query`,
  {
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
  },
  body
)

console.log('Status:', res.status)
console.log('Response:', res.body.slice(0, 400))

if (res.status !== 200 && res.status !== 201) {
  console.log('\n⚠ Management API rejected the request.')
  console.log('\nPlease apply the schema manually:')
  console.log(`1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`)
  console.log('2. Sign in to Supabase')
  console.log('3. Paste the contents of supabase/schema.sql')
  console.log('4. Click "Run"')
  console.log('\nAfter applying the schema, restart the server with: npm run server')
}
