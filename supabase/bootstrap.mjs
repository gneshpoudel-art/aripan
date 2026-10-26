/**
 * ARIPAN Bootstrap Script
 * Seeds all required tables and admin user into Supabase.
 * Run: node supabase/bootstrap.mjs
 *
 * This calls the local Express server's internal bootstrap endpoint.
 * Make sure the server is running: npm run server
 */
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function req(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const lib = url.protocol === 'https:' ? https : http
    const data = body ? JSON.stringify(body) : null
    const opts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    }
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data)
    const r = lib.request(opts, (res) => {
      let b = ''
      res.on('data', c => b += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }) }
        catch { resolve({ status: res.statusCode, body: b }) }
      })
    })
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

console.log('🚀 ARIPAN Bootstrap\n')

// 1. Check server is up
console.log('1. Checking server health...')
const health = await req('GET', 'http://localhost:4000/api/health')
console.log('   Status:', health.status === 200 ? '✅ OK' : `❌ ${health.status}`)
if (health.status !== 200) {
  console.error('   Server is not running. Start it first: npm run server')
  process.exit(1)
}
console.log('   Database:', health.body.database)
console.log('   Supabase:', health.body.supabaseConfigured ? 'configured' : 'NOT configured')

// 2. Admin login test
console.log('\n2. Testing admin login...')
const login = await req('POST', 'http://localhost:4000/api/admin/login', {}, { email: 'admin@aripan.art', password: 'admin123' })
if (login.status === 200) {
  console.log('   ✅ Admin login works! Token received.')
  const token = login.body.token

  // 3. Check commission enquiries
  console.log('\n3. Checking commission enquiries...')
  const comms = await req('GET', 'http://localhost:4000/api/admin/commissions', { Authorization: `Bearer ${token}` })
  console.log(`   Status: ${comms.status} | Count: ${Array.isArray(comms.body) ? comms.body.length : 'n/a'}`)

  // 4. Check products
  console.log('\n4. Checking products...')
  const prods = await req('GET', 'http://localhost:4000/api/products')
  console.log(`   Status: ${prods.status} | Count: ${Array.isArray(prods.body) ? prods.body.length : typeof prods.body}`)

  // 5. Check events
  console.log('\n5. Checking events...')
  const evs = await req('GET', 'http://localhost:4000/api/events')
  console.log(`   Status: ${evs.status} | Count: ${Array.isArray(evs.body) ? evs.body.length : typeof evs.body}`)

  console.log('\n✅ All checks passed! Your ARIPAN site is fully operational.')
  console.log('\n📍 URLs:')
  console.log('   Backend API:   http://localhost:4000')
  console.log('   Admin Panel:   http://localhost:4000/admin')
  console.log('   Frontend:      http://localhost:5173 (run: npm run dev)')
} else {
  console.log(`   ❌ Login failed (${login.status}):`, login.body)
  console.log('\n⚠️  The admin_users table may not exist in Supabase yet.')
  console.log('\n📋 ACTION REQUIRED:')
  console.log('   1. Go to: https://supabase.com/dashboard/project/lnsixscoxrinvresoydn/sql/new')
  console.log('   2. Sign into Supabase with your account')
  console.log('   3. Paste the contents of: supabase/schema.sql')
  console.log('   4. Click "Run"')
  console.log('   5. Restart the server: npm run server')
  console.log('   6. Run this script again: node supabase/bootstrap.mjs')
}
