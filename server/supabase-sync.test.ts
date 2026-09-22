import assert from 'node:assert/strict'
import test from 'node:test'
import { getSupabaseSyncStatus, queueSupabaseSync, runSupabaseSync } from './supabase-sync.js'

test('supabase sync status and queueing are operational', async () => {
  const status = getSupabaseSyncStatus()
  assert.ok(status)
  assert.equal(typeof status.configured, 'boolean')
  assert.equal(typeof status.status, 'string')

  const queued = queueSupabaseSync('customers', 'sync', { total: 1 })
  assert.equal(queued.entity, 'customers')
  assert.equal(queued.status, 'queued')

  const result = await runSupabaseSync('customers', 'sync')
  assert.ok(result)
  assert.equal(typeof result.status, 'string')
})
