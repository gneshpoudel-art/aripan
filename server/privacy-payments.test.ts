import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCustomerDataExport,
  createCustomerDataRequest,
  createPaymentAttempt,
  ensureSchema,
  getCustomerUserByEmail,
  registerCustomerAccount,
  resolveCustomerDataRequest,
  updatePaymentAttemptStatus,
} from './db.js'

test('privacy requests and payment attempts are durable', () => {
  ensureSchema()

  const email = `privacy.test.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`
  const customer = registerCustomerAccount({
    firstName: 'Ari',
    lastName: 'Pan',
    email,
    password: 'StrongPass123!',
    marketingConsent: true,
  })

  assert.ok(customer)

  const exportPayload = createCustomerDataExport(customer.id)
  assert.equal(exportPayload.profile.email, email)

  const request = createCustomerDataRequest(customer.id, 'delete', 'Requested by customer for privacy compliance review.')
  assert.equal(request.status, 'pending')

  const payment = createPaymentAttempt({
    orderId: 'order-privacy-1',
    customerId: customer.id,
    provider: 'manual',
    amount: 2400,
    currency: 'NRS',
    status: 'pending',
  })

  assert.equal(payment.status, 'pending')

  const paid = updatePaymentAttemptStatus(payment.id, 'paid', { gateway: 'manual', reference: 'manual-2400' })
  assert.equal(paid.status, 'paid')

  const resolved = resolveCustomerDataRequest(request.id, 'completed')
  assert.equal(resolved.status, 'completed')

  const match = getCustomerUserByEmail(email)
  assert.equal(match, undefined)
})
