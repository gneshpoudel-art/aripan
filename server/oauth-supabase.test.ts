import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGoogleOAuthUrl, exchangeGoogleCode, getProviderHealthSnapshot } from './providers.js'

test('google oauth generation and provider health are available', async () => {
  const url = buildGoogleOAuthUrl('demo-state')
  assert.match(url, /accounts.google.com/)
  assert.match(url, /client_id=/)
  assert.match(url, /state=demo-state/)

  const health = getProviderHealthSnapshot()
  assert.ok(health)
  assert.equal(typeof health.googleConfigured, 'boolean')
  assert.equal(typeof health.supabaseConfigured, 'boolean')

  const exchange = await exchangeGoogleCode('demo-code')
  assert.equal(exchange.configured, Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET))
})
