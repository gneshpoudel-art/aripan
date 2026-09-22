import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createBackupSnapshot,
  ensureSchema,
  getAnalyticsSummary,
  registerCustomerAccount,
  runStartupValidation,
  setCustomerCart,
  setProductInventory,
} from './db.js'

test('startup validation, backup snapshots, and analytics summaries are available', () => {
  ensureSchema()

  const email = `ops.test.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`
  const customer = registerCustomerAccount({
    firstName: 'Ops',
    lastName: 'Tester',
    email,
    password: 'StrongPass123!',
    marketingConsent: true,
  })

  assert.ok(customer)

  setProductInventory('ops-product-1', { stock: 12, lowStockThreshold: 5 })
  setCustomerCart(customer.id, [{
    id: 'ops-product-1',
    slug: 'ops-product',
    name: 'Ops Product',
    quantity: 2,
    price: 150,
    currency: 'NRS',
  }])

  const summary = getAnalyticsSummary()
  assert.ok(summary.totalCustomers >= 1)
  assert.ok(summary.inventoryCount >= 1)

  const validation = runStartupValidation()
  assert.ok(validation && typeof validation.status === 'string')
  assert.equal(validation.database, 'ok')

  const backup = createBackupSnapshot('ops-readiness')
  assert.ok(backup.path.includes('backup'))
  assert.equal(backup.status, 'created')
})
