import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createNotification,
  ensureMonitoringTables,
  getNotifications,
  getSystemHealthSnapshot,
  upsertSystemHealth,
} from './db.js'

test('notifications and monitoring records are persisted', () => {
  ensureMonitoringTables()

  createNotification({
    type: 'order_created',
    title: 'New order',
    message: 'A customer placed a new order.',
    recipientType: 'admin',
    recipientId: 'admin-1',
    channel: 'email',
    status: 'queued',
  })

  upsertSystemHealth('database', 'ok', { provider: 'sqlite' })
  upsertSystemHealth('backup', 'warning', { message: 'Backup service pending' })

  assert.equal(getNotifications().length >= 1, true)
  assert.equal(getSystemHealthSnapshot().database.status, 'ok')
  assert.equal(getSystemHealthSnapshot().backup.status, 'warning')
})
