import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createOrderFromCart,
  ensureSchema,
  getInventorySnapshot,
  getOrdersForCustomer,
  getAllOrdersForAdmin,
  registerCustomerAccount,
  setCustomerCart,
  setProductInventory,
} from './db.js'

test('checkout creates order and reduces inventory', () => {
  ensureSchema()

  setProductInventory('p-100', { stock: 5, lowStockThreshold: 2 })

  const email = `bina.checkout.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`
  const customer = registerCustomerAccount({
    firstName: 'Bina',
    lastName: 'Shah',
    email,
    password: 'StrongPass123!',
    marketingConsent: true,
  })

  assert.ok(customer)

  setCustomerCart(customer.id, [{
    id: 'p-100',
    slug: 'flower-study',
    name: 'Flower Study',
    quantity: 2,
    price: 1200,
    currency: 'NRS',
  }])

  const order = createOrderFromCart(customer.id, {
    shippingAddressId: 'addr-1',
    paymentProvider: 'mock',
    paymentStatus: 'paid',
    note: 'Gift wrap requested',
    buyer: {
      email,
      phone: '+977-98-1234567',
      age: 29,
      location: 'Kathmandu',
      deliveryDate: '2026-09-30',
      deliveryTime: '6:00 PM',
      notes: 'Please call before delivery',
    },
  })

  assert.equal(order.status, 'paid')
  assert.equal(order.items.length, 1)
  assert.equal(getInventorySnapshot('p-100').stock, 3)
  assert.equal(getOrdersForCustomer(customer.id).length, 1)
  assert.equal(order.metadata.phone, '+977-98-1234567')
  assert.equal(order.metadata.location, 'Kathmandu')

  const allOrders = getAllOrdersForAdmin()
  assert.ok(allOrders.some((entry) => entry.customerEmail === email && entry.metadata?.phone === '+977-98-1234567'))
})
