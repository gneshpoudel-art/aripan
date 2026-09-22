import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ensureSchema,
  getCustomerAddresses,
  getCustomerCart,
  getCustomerUserByEmail,
  getCustomerWishlist,
  registerCustomerAccount,
  setCustomerCart,
  setCustomerWishlist,
  upsertCustomerAddress,
} from './db.js'

test('customer registration and account data persist correctly', () => {
  ensureSchema()

  const email = `customer.test.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`
  const created = registerCustomerAccount({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email,
    password: 'StrongPass123!',
    marketingConsent: true,
  })

  assert.ok(created)

  const customer = getCustomerUserByEmail(email)
  assert.ok(customer)
  assert.equal(customer.email, email)

  const address = upsertCustomerAddress(customer.id, {
    label: 'Home',
    firstName: 'Ada',
    lastName: 'Lovelace',
    line1: '123 Garden Lane',
    city: 'Kathmandu',
    state: 'Bagmati',
    postalCode: '44600',
    country: 'Nepal',
    phone: '+977 9800000000',
  })

  assert.equal(address.label, 'Home')
  assert.equal(getCustomerAddresses(customer.id).length, 1)

  setCustomerCart(customer.id, [{
    id: 'p-100',
    slug: 'flower-study',
    name: 'Flower Study',
    quantity: 1,
    price: 1200,
    currency: 'NRS',
  }])
  setCustomerWishlist(customer.id, ['p-100'])

  assert.equal(getCustomerCart(customer.id)[0].name, 'Flower Study')
  assert.deepEqual(getCustomerWishlist(customer.id), ['p-100'])
})
