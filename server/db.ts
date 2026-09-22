import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { getSeedPayload } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const dbPath = path.isAbsolute(config.dbPath) ? config.dbPath : path.join(appRoot, config.dbPath)
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function ensureSchema() {
  const inventoryInfo = db.prepare('PRAGMA table_info(product_inventory)').all() as Array<{ name: string }>
  const inventoryForeignKeys = db.prepare('PRAGMA foreign_key_list(product_inventory)').all() as Array<{ id: number }>

  if (inventoryInfo.length > 0 && inventoryForeignKeys.length > 0) {
    db.exec('DROP TABLE product_inventory')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      marketing_consent INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customer_cart (
      customer_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customer_wishlist (
      customer_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customer_data_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      request_type TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_attempts (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'manual',
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'NRS',
      status TEXT NOT NULL DEFAULT 'pending',
      gateway TEXT,
      reference TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_inventory (
      product_id TEXT PRIMARY KEY,
      stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      shipping_address_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_provider TEXT NOT NULL DEFAULT 'manual',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      note TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      latitude REAL,
      longitude REAL,
      location_accuracy REAL,
      location_url TEXT,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      shipping_total REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      event TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      kind TEXT NOT NULL DEFAULT 'product',
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gallery_works (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS legal_pages (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      actor TEXT,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_roles (
      role_name TEXT PRIMARY KEY,
      permissions TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_content_blocks (
      block_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      recipient_type TEXT NOT NULL,
      recipient_id TEXT,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_health (
      service_name TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'ok',
      details TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      file_name TEXT NOT NULL,
      url TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      size INTEGER,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS page_seo_meta (
      page_key TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      canonical_url TEXT,
      og_title TEXT,
      og_description TEXT,
      og_image TEXT,
      json_ld TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const orderColumns = db.prepare('PRAGMA table_info(orders)').all() as Array<{ name: string }>
  if (!orderColumns.some((column) => column.name === 'metadata')) {
    db.exec("ALTER TABLE orders ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'")
  }
  if (!orderColumns.some((column) => column.name === 'latitude')) {
    db.exec('ALTER TABLE orders ADD COLUMN latitude REAL')
  }
  if (!orderColumns.some((column) => column.name === 'longitude')) {
    db.exec('ALTER TABLE orders ADD COLUMN longitude REAL')
  }
  if (!orderColumns.some((column) => column.name === 'location_accuracy')) {
    db.exec('ALTER TABLE orders ADD COLUMN location_accuracy REAL')
  }
  if (!orderColumns.some((column) => column.name === 'location_url')) {
    db.exec('ALTER TABLE orders ADD COLUMN location_url TEXT')
  }
}

export function hasSeedData() {
  const counts = {
    products: db.prepare('SELECT COUNT(*) as total FROM products').get()?.total ?? 0,
    collections: db.prepare('SELECT COUNT(*) as total FROM collections').get()?.total ?? 0,
    gallery_works: db.prepare('SELECT COUNT(*) as total FROM gallery_works').get()?.total ?? 0,
    articles: db.prepare('SELECT COUNT(*) as total FROM articles').get()?.total ?? 0,
    legal_pages: db.prepare('SELECT COUNT(*) as total FROM legal_pages').get()?.total ?? 0,
  }

  return Object.values(counts).some((count) => Number(count) > 0)
}

export function seedDatabase() {
  const payload = getSeedPayload()

  for (const item of payload.products) {
    db.prepare(`INSERT OR REPLACE INTO products (id, slug, kind, data, updated_at) VALUES (@id, @slug, 'product', @data, datetime('now'))`).run({
      id: item.id,
      slug: item.slug,
      data: JSON.stringify(item),
    })
  }

  for (const item of payload.collections) {
    db.prepare(`INSERT OR REPLACE INTO collections (id, slug, data, updated_at) VALUES (@id, @slug, @data, datetime('now'))`).run({
      id: item.slug,
      slug: item.slug,
      data: JSON.stringify(item),
    })
  }

  for (const item of payload.galleryWorks) {
    db.prepare(`INSERT OR REPLACE INTO gallery_works (id, slug, data, updated_at) VALUES (@id, @slug, @data, datetime('now'))`).run({
      id: item.id,
      slug: item.slug,
      data: JSON.stringify(item),
    })
  }

  for (const item of payload.articles) {
    db.prepare(`INSERT OR REPLACE INTO articles (id, slug, data, updated_at) VALUES (@id, @slug, @data, datetime('now'))`).run({
      id: item.slug,
      slug: item.slug,
      data: JSON.stringify(item),
    })
  }

  for (const [slug, page] of Object.entries(payload.legalPages)) {
    db.prepare(`INSERT OR REPLACE INTO legal_pages (id, slug, data, updated_at) VALUES (@id, @slug, @data, datetime('now'))`).run({
      id: slug,
      slug,
      data: JSON.stringify(page),
    })
  }

  db.prepare(`INSERT OR IGNORE INTO site_settings (id, key, value) VALUES ('site-meta', 'site-meta', @data)`).run({
    data: JSON.stringify({
      site: payload.site,
      artist: payload.artist,
      testimonials: payload.testimonials,
    }),
  })

  db.prepare(`INSERT INTO admin_users (id, email, password_hash, role)
    VALUES (@id, @email, @passwordHash, 'super_admin')
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, updated_at = datetime('now')`).run({
    id: 'admin-1',
    email: config.adminEmail,
    passwordHash: bcrypt.hashSync(config.adminPassword, 10),
  })
}

export function readRows<T>(table: string): T[] {
  const rows = db.prepare(`SELECT data FROM ${table} ORDER BY created_at DESC`).all() as Array<{ data: string }>
  return rows.map((row) => JSON.parse(row.data) as T)
}

export function upsertRecord<T>(table: string, id: string, slug: string, data: T) {
  // Delete any existing row with this slug (different id) to avoid unique constraint
  db.prepare(`DELETE FROM ${table} WHERE slug = @slug AND id != @id`).run({ slug, id })
  db.prepare(`INSERT INTO ${table} (id, slug, data, updated_at)
    VALUES (@id, @slug, @data, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, data = excluded.data, updated_at = datetime('now')`).run({
    id,
    slug,
    data: JSON.stringify(data),
  })
}

export function deleteRecord(table: string, id: string) {
  db.prepare(`DELETE FROM ${table} WHERE id = @id`).run({ id })
}

export function createAuditLog(action: string, details: Record<string, unknown>, actor?: string, entityType?: string, entityId?: string) {
  db.prepare(`INSERT INTO audit_logs (id, action, actor, entity_type, entity_id, details)
    VALUES (@id, @action, @actor, @entityType, @entityId, @details)`).run({
    id: randomUUID(),
    action,
    actor,
    entityType,
    entityId,
    details: JSON.stringify(details),
  })
}

export function registerCustomerAccount(input: {
  firstName: string
  lastName: string
  email: string
  password: string
  marketingConsent?: boolean
}) {
  const normalizedEmail = input.email.trim().toLowerCase()
  const existing = getCustomerUserByEmail(normalizedEmail)
  if (existing) {
    return null
  }

  const customerId = randomUUID()
  db.prepare(`INSERT INTO customers (id, email, password_hash, first_name, last_name, marketing_consent, updated_at)
    VALUES (@id, @email, @passwordHash, @firstName, @lastName, @marketingConsent, datetime('now'))`).run({
    id: customerId,
    email: normalizedEmail,
    passwordHash: bcrypt.hashSync(input.password, 10),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    marketingConsent: input.marketingConsent ? 1 : 0,
  })

  return getCustomerUserByEmail(normalizedEmail)
}

export function getCustomerUserByEmail(email: string) {
  const row = db.prepare('SELECT * FROM customers WHERE email = ?').get(email.trim().toLowerCase()) as
    | { id: string; email: string; password_hash: string; first_name: string; last_name: string; marketing_consent: number; last_login_at?: string }
    | undefined

  if (!row) return undefined

  return {
    ...row,
    marketingConsent: Boolean(row.marketing_consent),
    firstName: row.first_name,
    lastName: row.last_name,
  }
}

export function getCustomerById(id: string) {
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as
    | { id: string; email: string; password_hash: string; first_name: string; last_name: string; marketing_consent: number; last_login_at?: string }
    | undefined

  if (!row) return undefined

  return {
    ...row,
    marketingConsent: Boolean(row.marketing_consent),
    firstName: row.first_name,
    lastName: row.last_name,
  }
}

export function getCustomerAddresses(customerId: string) {
  const rows = db.prepare('SELECT data FROM customer_addresses WHERE customer_id = ? ORDER BY created_at DESC').all(customerId) as Array<{ data: string }>
  return rows.map((row) => JSON.parse(row.data))
}

export function upsertCustomerAddress(customerId: string, address: Record<string, unknown>) {
  const record = {
    ...address,
    id: String((address as { id?: string }).id ?? randomUUID()),
    customerId,
  }

  db.prepare(`INSERT INTO customer_addresses (id, customer_id, data, updated_at)
    VALUES (@id, @customerId, @data, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`).run({
    id: record.id,
    customerId,
    data: JSON.stringify(record),
  })

  return record
}

export function getCustomerCart(customerId: string) {
  const row = db.prepare('SELECT data FROM customer_cart WHERE customer_id = ?').get(customerId) as { data: string } | undefined
  return row ? JSON.parse(row.data) : []
}

export function setCustomerCart(customerId: string, items: unknown[]) {
  db.prepare(`INSERT INTO customer_cart (customer_id, data, updated_at)
    VALUES (@customerId, @data, datetime('now'))
    ON CONFLICT(customer_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`).run({
    customerId,
    data: JSON.stringify(items),
  })

  return items
}

export function getCustomerWishlist(customerId: string) {
  const row = db.prepare('SELECT data FROM customer_wishlist WHERE customer_id = ?').get(customerId) as { data: string } | undefined
  return row ? JSON.parse(row.data) : []
}

export function setCustomerWishlist(customerId: string, items: string[]) {
  db.prepare(`INSERT INTO customer_wishlist (customer_id, data, updated_at)
    VALUES (@customerId, @data, datetime('now'))
    ON CONFLICT(customer_id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`).run({
    customerId,
    data: JSON.stringify(items),
  })

  return items
}

export function createCustomerDataExport(customerId: string) {
  const customer = getCustomerById(customerId)
  if (!customer) {
    throw new Error('Customer not found.')
  }

  const payload = {
    id: randomUUID(),
    customerId,
    profile: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      marketingConsent: customer.marketingConsent,
      createdAt: customer.created_at ?? null,
      lastLoginAt: customer.last_login_at ?? null,
    },
    addresses: getCustomerAddresses(customerId),
    orders: getOrdersForCustomer(customerId),
    cart: getCustomerCart(customerId),
    wishlist: getCustomerWishlist(customerId),
    exportedAt: new Date().toISOString(),
  }

  createAuditLog('customer_data_export_created', { customerId, exportId: payload.id }, customer.email, 'customer', customerId)
  return payload
}

export function createCustomerDataRequest(customerId: string, requestType: 'export' | 'delete', reason?: string) {
  const customer = getCustomerById(customerId)
  if (!customer) {
    throw new Error('Customer not found.')
  }

  const requestId = randomUUID()
  db.prepare(`INSERT INTO customer_data_requests (id, customer_id, request_type, reason, status, metadata, created_at)
    VALUES (@id, @customerId, @requestType, @reason, @status, @metadata, datetime('now'))`).run({
    id: requestId,
    customerId,
    requestType,
    reason: reason ?? null,
    status: 'pending',
    metadata: JSON.stringify({ reason: reason ?? ''}),
  })

  createAuditLog('customer_data_request_created', { customerId, requestId, requestType }, customer.email, 'customer_data_request', requestId)
  return {
    id: requestId,
    customerId,
    requestType,
    reason: reason ?? null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export function resolveCustomerDataRequest(requestId: string, status: 'completed' | 'rejected' | 'pending' = 'completed', metadata: Record<string, unknown> = {}) {
  const row = db.prepare('SELECT * FROM customer_data_requests WHERE id = ?').get(requestId) as {
    id: string
    customer_id: string
    request_type: 'export' | 'delete'
    reason: string | null
    status: string
    created_at: string
    metadata: string | null
  } | undefined

  if (!row) {
    throw new Error('Data request not found.')
  }

  db.prepare(`UPDATE customer_data_requests
    SET status = @status, resolved_at = datetime('now'), metadata = @metadata
    WHERE id = @id`).run({
    id: requestId,
    status,
    metadata: JSON.stringify(metadata),
  })

  if (row.request_type === 'delete' && status === 'completed') {
    db.prepare('DELETE FROM customers WHERE id = ?').run(row.customer_id)
    createAuditLog('customer_data_request_completed_delete', { customerId: row.customer_id, requestId }, 'system', 'customer_data_request', requestId)
  }

  return {
    id: row.id,
    customerId: row.customer_id,
    requestType: row.request_type,
    reason: row.reason,
    status,
    createdAt: row.created_at,
    resolvedAt: new Date().toISOString(),
  }
}

export function updateCustomerLastLogin(customerId: string) {
  db.prepare('UPDATE customers SET last_login_at = datetime("now"), updated_at = datetime("now") WHERE id = ?').run(customerId)
}

export function setProductInventory(productId: string, config: { stock: number; lowStockThreshold?: number }) {
  db.prepare(`INSERT INTO product_inventory (product_id, stock, low_stock_threshold, updated_at)
    VALUES (@productId, @stock, @lowStockThreshold, datetime('now'))
    ON CONFLICT(product_id) DO UPDATE SET stock = excluded.stock, low_stock_threshold = excluded.low_stock_threshold, updated_at = datetime('now')`).run({
    productId,
    stock: Number(config.stock),
    lowStockThreshold: Number(config.lowStockThreshold ?? 5),
  })

  return getInventorySnapshot(productId)
}

export function getInventorySnapshot(productId: string) {
  const row = db.prepare('SELECT stock, low_stock_threshold FROM product_inventory WHERE product_id = ?').get(productId) as { stock: number; low_stock_threshold: number } | undefined
  return {
    productId,
    stock: Number(row?.stock ?? 0),
    lowStockThreshold: Number(row?.low_stock_threshold ?? 5),
    lowStock: Number(row?.stock ?? 0) <= Number(row?.low_stock_threshold ?? 5),
  }
}

export function getOrdersForCustomer(customerId: string) {
  const rows = db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(customerId) as Array<{
    id: string
    customer_id: string
    shipping_address_id: string | null
    status: string
    payment_provider: string
    payment_status: string
    note: string | null
    metadata: string | null
    items: string
    subtotal: number
    shipping_total: number
    total: number
    created_at: string
    updated_at: string
  }>

  return rows.map((row) => ({
    ...row,
    items: JSON.parse(row.items),
    shippingAddressId: row.shipping_address_id,
    metadata: JSON.parse(row.metadata ?? '{}'),
    latitude: (row as any).latitude ?? null,
    longitude: (row as any).longitude ?? null,
    locationAccuracy: (row as any).location_accuracy ?? null,
    locationUrl: (row as any).location_url ?? null,
  }))
}

export function getOrderById(orderId: string) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
  if (!row) return null
  return {
    ...row,
    items: JSON.parse(row.items || '[]'),
    metadata: JSON.parse(row.metadata || '{}'),
    shippingAddressId: row.shipping_address_id,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    locationAccuracy: row.location_accuracy ?? null,
    locationUrl: row.location_url ?? null,
  }
}

export function updateCustomerOrder(orderId: string, customerId: string, updates: {
  deliveryDate?: string
  deliveryTime?: string
  address?: string
  notes?: string
  phone?: string
  name?: string
  status?: string
}) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
  if (!order) throw new Error('Order not found.')
  if (order.customer_id !== customerId) throw new Error('Unauthorized to modify this order.')

  const existingMeta = JSON.parse(order.metadata || '{}')
  const newMeta = {
    ...existingMeta,
    ...(updates.deliveryDate ? { deliveryDate: updates.deliveryDate } : {}),
    ...(updates.deliveryTime ? { deliveryTime: updates.deliveryTime } : {}),
    ...(updates.address ? { address: updates.address, location: updates.address } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    ...(updates.phone ? { phone: updates.phone } : {}),
    ...(updates.name ? { name: updates.name } : {}),
  }

  const newStatus = updates.status || order.status

  db.prepare(`UPDATE orders SET metadata = @metadata, status = @status, updated_at = datetime('now') WHERE id = @id`).run({
    id: orderId,
    metadata: JSON.stringify(newMeta),
    status: newStatus,
  })

  db.prepare(`INSERT INTO order_events (id, order_id, event, details, created_at)
    VALUES (@id, @orderId, @event, @details, datetime('now'))`).run({
    id: randomUUID(),
    orderId,
    event: newStatus === 'cancelled' ? 'cancelled' : 'updated',
    details: JSON.stringify({ updates, metadata: newMeta, status: newStatus }),
  })

  return getOrderById(orderId)
}

export function cancelCustomerOrder(orderId: string, customerId: string, reason = 'Cancelled by customer') {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
  if (!order) throw new Error('Order not found.')
  if (order.customer_id !== customerId) throw new Error('Unauthorized to cancel this order.')
  if (order.status === 'cancelled') throw new Error('Order is already cancelled.')

  const existingMeta = JSON.parse(order.metadata || '{}')
  existingMeta.cancellationReason = reason
  existingMeta.cancelledAt = new Date().toISOString()

  db.prepare(`UPDATE orders SET status = 'cancelled', metadata = @metadata, updated_at = datetime('now') WHERE id = @id`).run({
    id: orderId,
    metadata: JSON.stringify(existingMeta),
  })

  // Restore inventory for items if cancelled
  try {
    const items = JSON.parse(order.items || '[]')
    for (const item of items) {
      if (item.id && item.quantity) {
        const current = getInventorySnapshot(item.id)
        setProductInventory(item.id, { stock: current.stock + item.quantity, lowStockThreshold: current.lowStockThreshold })
      }
    }
  } catch {}

  db.prepare(`INSERT INTO order_events (id, order_id, event, details, created_at)
    VALUES (@id, @orderId, 'cancelled', @details, datetime('now'))`).run({
    id: randomUUID(),
    orderId,
    details: JSON.stringify({ reason, metadata: existingMeta }),
  })

  return getOrderById(orderId)
}

export function getAllOrdersForAdmin() {
  const rows = db.prepare(`
    SELECT o.*, c.email AS customer_email, c.first_name AS customer_first_name, c.last_name AS customer_last_name
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ORDER BY o.created_at DESC
  `).all() as Array<{
    id: string
    customer_id: string
    customer_email: string | null
    customer_first_name: string | null
    customer_last_name: string | null
    shipping_address_id: string | null
    status: string
    payment_provider: string
    payment_status: string
    note: string | null
    metadata: string | null
    items: string
    subtotal: number
    shipping_total: number
    total: number
    created_at: string
    updated_at: string
  }>

  return rows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    customerEmail: row.customer_email,
    customerName: row.customer_first_name && row.customer_last_name
      ? `${row.customer_first_name} ${row.customer_last_name}`.trim()
      : row.customer_email ?? 'Unknown customer',
    shippingAddressId: row.shipping_address_id,
    status: row.status,
    paymentProvider: row.payment_provider,
    paymentStatus: row.payment_status,
    note: row.note,
    items: JSON.parse(row.items),
    subtotal: Number(row.subtotal),
    shippingTotal: Number(row.shipping_total),
    total: Number(row.total),
    metadata: JSON.parse(row.metadata ?? '{}'),
    latitude: (row as any).latitude ?? null,
    longitude: (row as any).longitude ?? null,
    locationAccuracy: (row as any).location_accuracy ?? null,
    locationUrl: (row as any).location_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export function updateOrderStatus(orderId: string, status: string) {
  db.prepare(`UPDATE orders SET status = @status, updated_at = datetime('now') WHERE id = @id`).run({
    id: orderId,
    status,
  })
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)
}

export function createPaymentAttempt(input: {
  orderId: string
  customerId: string
  provider?: string
  amount: number
  currency?: string
  status?: 'pending' | 'paid' | 'failed' | 'refunded'
  gateway?: string
  reference?: string
  metadata?: Record<string, unknown>
}) {
  const paymentId = randomUUID()
  db.prepare(`INSERT INTO payment_attempts (id, order_id, customer_id, provider, amount, currency, status, gateway, reference, metadata, updated_at)
    VALUES (@id, @orderId, @customerId, @provider, @amount, @currency, @status, @gateway, @reference, @metadata, datetime('now'))`).run({
    id: paymentId,
    orderId: input.orderId,
    customerId: input.customerId,
    provider: input.provider ?? 'manual',
    amount: Number(input.amount),
    currency: input.currency ?? 'NRS',
    status: input.status ?? 'pending',
    gateway: input.gateway ?? null,
    reference: input.reference ?? null,
    metadata: JSON.stringify(input.metadata ?? {}),
  })

  createAuditLog('payment_attempt_created', { paymentId, orderId: input.orderId, customerId: input.customerId, status: input.status ?? 'pending' }, 'system', 'payment_attempt', paymentId)
  return {
    id: paymentId,
    orderId: input.orderId,
    customerId: input.customerId,
    provider: input.provider ?? 'manual',
    amount: Number(input.amount),
    currency: input.currency ?? 'NRS',
    status: input.status ?? 'pending',
    gateway: input.gateway ?? null,
    reference: input.reference ?? null,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  }
}

export function updatePaymentAttemptStatus(paymentId: string, status: 'pending' | 'paid' | 'failed' | 'refunded', metadata: Record<string, unknown> = {}) {
  const row = db.prepare('SELECT * FROM payment_attempts WHERE id = ?').get(paymentId) as {
    id: string
    order_id: string
    customer_id: string
    provider: string
    amount: number
    currency: string
    status: string
    gateway: string | null
    reference: string | null
    metadata: string | null
    created_at: string
  } | undefined

  if (!row) {
    throw new Error('Payment attempt not found.')
  }

  db.prepare(`UPDATE payment_attempts
    SET status = @status, metadata = @metadata, updated_at = datetime('now')
    WHERE id = @id`).run({
    id: paymentId,
    status,
    metadata: JSON.stringify(metadata),
  })

  const updated = db.prepare('SELECT * FROM payment_attempts WHERE id = ?').get(paymentId) as any
  createAuditLog('payment_attempt_updated', { paymentId, orderId: row.order_id, status }, 'system', 'payment_attempt', paymentId)

  return {
    id: updated.id,
    orderId: updated.order_id,
    customerId: updated.customer_id,
    provider: updated.provider,
    amount: Number(updated.amount),
    currency: updated.currency,
    status: updated.status,
    gateway: updated.gateway,
    reference: updated.reference,
    metadata: JSON.parse(updated.metadata || '{}'),
    createdAt: updated.created_at,
  }
}

export function createOrderFromCart(customerId: string, input: {
  shippingAddressId?: string
  paymentProvider?: string
  paymentStatus?: string
  note?: string
  items?: Array<{
    id: string
    slug?: string
    name?: string
    price?: number
    quantity?: number
    image?: string
    currency?: string
    [key: string]: unknown
  }>
  buyer?: {
    email?: string
    phone?: string
    age?: number | string
    location?: string
    address?: string
    deliveryDate?: string
    deliveryTime?: string
    notes?: string
    latitude?: number
    longitude?: number
    location_accuracy?: number
    location_url?: string
    [key: string]: unknown
  }
}) {
  const cart = (Array.isArray(input.items) && input.items.length > 0)
    ? input.items
    : getCustomerCart(customerId)

  if (!Array.isArray(cart) || cart.length === 0) {
    throw new Error('Cart is empty.')
  }

  let subtotal = 0
  const items: Array<{ id: string; slug: string; name: string; quantity: number; price: number; currency: string; image: string }> = []

  for (const entry of cart as Array<Record<string, unknown>>) {
    const productId = String(entry.id)
    const quantity = Number(entry.quantity ?? 1)
    let price = Number(entry.price ?? 0)
    let name = entry.name ? String(entry.name) : ''
    let image = entry.image ? String(entry.image) : (Array.isArray(entry.images) ? String(entry.images[0]) : '')

    // Look up in products table if name, image, or price is missing
    if (!name || !image || !price) {
      const prodRow = db.prepare('SELECT data FROM products WHERE id = ? OR slug = ?').get(productId, productId) as { data: string } | undefined
      if (prodRow) {
        try {
          const prodData = JSON.parse(prodRow.data)
          name = name || prodData.name || productId
          image = image || (Array.isArray(prodData.images) ? prodData.images[0] : '') || prodData.image || ''
          price = price || Number(prodData.price ?? 0)
        } catch {}
      }
    }
    if (!name) name = productId

    const current = getInventorySnapshot(productId)
    // Auto-replenish stock so custom/gallery orders are never blocked by missing inventory records
    if (current.stock < quantity) {
      setProductInventory(productId, { stock: Math.max(50, quantity + 10), lowStockThreshold: 5 })
    }

    subtotal += price * quantity
    items.push({
      id: productId,
      slug: String(entry.slug ?? productId),
      name,
      quantity,
      price,
      currency: String(entry.currency ?? 'NRS'),
      image,
    })
  }

  const shippingTotal = 0
  const total = subtotal + shippingTotal
  const orderId = randomUUID()
  const customer = getCustomerById(customerId)
  const metadata = {
    ...(input.buyer ?? {}),
    email: input.buyer?.email ?? customer?.email ?? '',
  }

  const latitude = typeof input.buyer?.latitude === 'number' ? input.buyer.latitude : null
  const longitude = typeof input.buyer?.longitude === 'number' ? input.buyer.longitude : null
  const locationAccuracy = typeof input.buyer?.location_accuracy === 'number' ? input.buyer.location_accuracy : null
  const locationUrl = typeof input.buyer?.location_url === 'string' ? input.buyer.location_url
    : (latitude !== null && longitude !== null ? `https://www.google.com/maps?q=${latitude},${longitude}` : null)

  db.prepare(`INSERT INTO orders (id, customer_id, shipping_address_id, status, payment_provider, payment_status, note, metadata, latitude, longitude, location_accuracy, location_url, items, subtotal, shipping_total, total, updated_at)
    VALUES (@id, @customerId, @shippingAddressId, @status, @paymentProvider, @paymentStatus, @note, @metadata, @latitude, @longitude, @locationAccuracy, @locationUrl, @items, @subtotal, @shippingTotal, @total, datetime('now'))`).run({
    id: orderId,
    customerId,
    shippingAddressId: input.shippingAddressId ?? null,
    status: input.paymentStatus === 'paid' ? 'paid' : 'pending',
    paymentProvider: input.paymentProvider ?? 'manual',
    paymentStatus: input.paymentStatus ?? 'pending',
    note: input.note ?? null,
    metadata: JSON.stringify(metadata),
    latitude,
    longitude,
    locationAccuracy,
    locationUrl,
    items: JSON.stringify(items),
    subtotal,
    shippingTotal,
    total,
  })

  for (const item of items) {
    const current = getInventorySnapshot(item.id)
    setProductInventory(item.id, { stock: Math.max(0, current.stock - item.quantity), lowStockThreshold: current.lowStockThreshold })
  }

  db.prepare(`INSERT INTO order_events (id, order_id, event, details, created_at)
    VALUES (@id, @orderId, @event, @details, datetime('now'))`).run({
    id: randomUUID(),
    orderId,
    event: 'created',
    details: JSON.stringify({ items, total, paymentStatus: input.paymentStatus ?? 'pending', metadata }),
  })

  db.prepare('DELETE FROM customer_cart WHERE customer_id = ?').run(customerId)

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
  return {
    id: order.id,
    customerId: order.customer_id,
    shippingAddressId: order.shipping_address_id,
    status: order.status,
    paymentProvider: order.payment_provider,
    paymentStatus: order.payment_status,
    note: order.note,
    items: JSON.parse(order.items),
    subtotal: order.subtotal,
    shippingTotal: order.shipping_total,
    total: order.total,
    metadata: JSON.parse(order.metadata || '{}'),
    latitude: order.latitude ?? null,
    longitude: order.longitude ?? null,
    locationAccuracy: order.location_accuracy ?? null,
    locationUrl: order.location_url ?? null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  }
}

export function ensureAdminUser(passwordHash = bcrypt.hashSync(config.adminPassword, 10)) {
  db.prepare(`INSERT INTO admin_users (id, email, password_hash, role)
    VALUES ('admin-1', @email, @passwordHash, 'super_admin')
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, updated_at = datetime('now')`).run({
    email: config.adminEmail,
    passwordHash,
  })
}

export function getAdminUserByEmail(email: string) {
  return db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email) as { id: string; email: string; role: string; password_hash: string } | undefined
}

export function ensureDefaultAdminRoles() {
  const adminRolesCheck = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'admin_roles'").get() as { name?: string } | undefined
  if (!adminRolesCheck) {
    db.exec(`
      CREATE TABLE admin_roles (
        role_name TEXT PRIMARY KEY,
        permissions TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  const contentBlocksCheck = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'site_content_blocks'").get() as { name?: string } | undefined
  if (!contentBlocksCheck) {
    db.exec(`
      CREATE TABLE site_content_blocks (
        block_key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  const defaults = {
    super_admin: {
      canEditProducts: true,
      canEditContent: true,
      canManageOrders: true,
      canManageCustomers: true,
      canManageUsers: true,
      canManageSettings: true,
    },
    admin: {
      canEditProducts: true,
      canEditContent: true,
      canManageOrders: true,
      canManageCustomers: true,
      canManageUsers: false,
      canManageSettings: false,
    },
    content_manager: {
      canEditProducts: false,
      canEditContent: true,
      canManageOrders: false,
      canManageCustomers: false,
      canManageUsers: false,
      canManageSettings: false,
    },
    order_manager: {
      canEditProducts: false,
      canEditContent: false,
      canManageOrders: true,
      canManageCustomers: false,
      canManageUsers: false,
      canManageSettings: false,
    },
  }

  for (const [roleName, permissions] of Object.entries(defaults)) {
    db.prepare(`INSERT INTO admin_roles (role_name, permissions, updated_at)
      VALUES (@roleName, @permissions, datetime('now'))
      ON CONFLICT(role_name) DO UPDATE SET permissions = excluded.permissions, updated_at = datetime('now')`).run({
      roleName,
      permissions: JSON.stringify(permissions),
    })
  }

  return defaults
}

export function getAdminRolePermissions(roleName: string) {
  const row = db.prepare('SELECT permissions FROM admin_roles WHERE role_name = ?').get(roleName) as { permissions: string } | undefined
  return row ? JSON.parse(row.permissions) : null
}

export function upsertSiteContentBlock(blockKey: string, data: Record<string, unknown>) {
  db.prepare(`INSERT INTO site_content_blocks (block_key, data, updated_at)
    VALUES (@blockKey, @data, datetime('now'))
    ON CONFLICT(block_key) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`).run({
    blockKey,
    data: JSON.stringify(data),
  })

  return data
}

export function getSiteContentBlock(blockKey: string) {
  const row = db.prepare('SELECT data FROM site_content_blocks WHERE block_key = ?').get(blockKey) as { data: string } | undefined
  return row ? JSON.parse(row.data) : null
}

export function createNotification(input: {
  type: string
  title: string
  message: string
  recipientType: string
  recipientId?: string
  channel: string
  status?: string
}) {
  const id = randomUUID()
  db.prepare(`INSERT INTO notifications (id, type, title, message, recipient_type, recipient_id, channel, status, updated_at)
    VALUES (@id, @type, @title, @message, @recipientType, @recipientId, @channel, @status, datetime('now'))`).run({
    id,
    type: input.type,
    title: input.title,
    message: input.message,
    recipientType: input.recipientType,
    recipientId: input.recipientId ?? null,
    channel: input.channel,
    status: input.status ?? 'queued',
  })

  return { id, ...input, status: input.status ?? 'queued' }
}

export function getNotifications() {
  const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  return rows.map((row) => ({
    ...row,
    recipientId: row.recipient_id,
    recipientType: row.recipient_type,
  }))
}

export function ensureMonitoringTables() {
  const check = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'system_health'").get() as { name?: string } | undefined
  if (!check) {
    db.exec(`
      CREATE TABLE system_health (
        service_name TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'ok',
        details TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  const notificationsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notifications'").get() as { name?: string } | undefined
  if (!notificationsCheck) {
    db.exec(`
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        recipient_type TEXT NOT NULL,
        recipient_id TEXT,
        channel TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }
}

export function upsertSystemHealth(serviceName: string, status: string, details: Record<string, unknown> = {}) {
  db.prepare(`INSERT INTO system_health (service_name, status, details, updated_at)
    VALUES (@serviceName, @status, @details, datetime('now'))
    ON CONFLICT(service_name) DO UPDATE SET status = excluded.status, details = excluded.details, updated_at = datetime('now')`).run({
    serviceName,
    status,
    details: JSON.stringify(details),
  })

  return { serviceName, status, details }
}

export function ensureMediaSeoTables() {
  const mediaCheck = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'media_assets'").get() as { name?: string } | undefined
  if (!mediaCheck) {
    db.exec(`
      CREATE TABLE media_assets (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        file_name TEXT NOT NULL,
        url TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        size INTEGER,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  const seoCheck = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'page_seo_meta'").get() as { name?: string } | undefined
  if (!seoCheck) {
    db.exec(`
      CREATE TABLE page_seo_meta (
        page_key TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        canonical_url TEXT,
        og_title TEXT,
        og_description TEXT,
        og_image TEXT,
        json_ld TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }
}

export function setMediaAsset(asset: {
  id: string
  kind: string
  fileName: string
  url: string
  width?: number
  height?: number
  size?: number
  metadata?: Record<string, unknown>
}) {
  db.prepare(`INSERT INTO media_assets (id, kind, file_name, url, width, height, size, metadata, updated_at)
    VALUES (@id, @kind, @fileName, @url, @width, @height, @size, @metadata, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, file_name = excluded.file_name, url = excluded.url, width = excluded.width, height = excluded.height, size = excluded.size, metadata = excluded.metadata, updated_at = datetime('now')`).run({
    id: asset.id,
    kind: asset.kind,
    fileName: asset.fileName,
    url: asset.url,
    width: asset.width ?? null,
    height: asset.height ?? null,
    size: asset.size ?? null,
    metadata: asset.metadata ? JSON.stringify(asset.metadata) : null,
  })

  return asset
}

export function getMediaAsset(assetId: string) {
  const row = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(assetId) as {
    id: string
    kind: string
    file_name: string
    url: string
    width: number | null
    height: number | null
    size: number | null
    metadata: string | null
  } | undefined

  if (!row) return null

  return {
    id: row.id,
    kind: row.kind,
    fileName: row.file_name,
    url: row.url,
    width: row.width,
    height: row.height,
    size: row.size,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }
}

export function upsertPageSeoMeta(pageKey: string, meta: Record<string, unknown>) {
  db.prepare(`INSERT INTO page_seo_meta (page_key, title, description, canonical_url, og_title, og_description, og_image, json_ld, updated_at)
    VALUES (@pageKey, @title, @description, @canonicalUrl, @ogTitle, @ogDescription, @ogImage, @jsonLd, datetime('now'))
    ON CONFLICT(page_key) DO UPDATE SET title = excluded.title, description = excluded.description, canonical_url = excluded.canonical_url, og_title = excluded.og_title, og_description = excluded.og_description, og_image = excluded.og_image, json_ld = excluded.json_ld, updated_at = datetime('now')`).run({
    pageKey,
    title: meta.title ?? null,
    description: meta.description ?? null,
    canonicalUrl: meta.canonicalUrl ?? null,
    ogTitle: meta.ogTitle ?? null,
    ogDescription: meta.ogDescription ?? null,
    ogImage: meta.ogImage ?? null,
    jsonLd: meta.jsonLd ? JSON.stringify(meta.jsonLd) : null,
  })

  return meta
}

export function getPageSeoMeta(pageKey: string) {
  const row = db.prepare('SELECT * FROM page_seo_meta WHERE page_key = ?').get(pageKey) as {
    page_key: string
    title: string | null
    description: string | null
    canonical_url: string | null
    og_title: string | null
    og_description: string | null
    og_image: string | null
    json_ld: string | null
  } | undefined

  if (!row) return null

  return {
    pageKey: row.page_key,
    title: row.title,
    description: row.description,
    canonicalUrl: row.canonical_url,
    ogTitle: row.og_title,
    ogDescription: row.og_description,
    ogImage: row.og_image,
    jsonLd: row.json_ld ? JSON.parse(row.json_ld) : null,
  }
}

export function getSystemHealthSnapshot() {
  const rows = db.prepare('SELECT service_name, status, details FROM system_health').all() as Array<{ service_name: string; status: string; details: string }>

  return rows.reduce<Record<string, { status: string; details: Record<string, unknown> }>>((acc, row) => {
    acc[row.service_name] = {
      status: row.status,
      details: JSON.parse(row.details || '{}'),
    }
    return acc
  }, {})
}

export function getAnalyticsSummary() {
  const totalCustomers = Number(db.prepare('SELECT COUNT(*) as total FROM customers').get()?.total ?? 0)
  const totalOrders = Number(db.prepare('SELECT COUNT(*) as total FROM orders').get()?.total ?? 0)
  const totalRevenue = Number(db.prepare('SELECT COALESCE(SUM(total), 0) as total FROM orders').get()?.total ?? 0)
  const inventoryCount = Number(db.prepare('SELECT COUNT(*) as total FROM product_inventory').get()?.total ?? 0)
  const lowStockCount = Number(db.prepare('SELECT COUNT(*) as total FROM product_inventory WHERE stock <= low_stock_threshold').get()?.total ?? 0)
  const totalProducts = Number(db.prepare('SELECT COUNT(*) as total FROM products').get()?.total ?? 0)

  return {
    totalCustomers,
    totalOrders,
    totalRevenue,
    totalProducts,
    inventoryCount,
    lowStockCount,
    updatedAt: new Date().toISOString(),
  }
}

export function runStartupValidation() {
  const dbHealthy = db.prepare('SELECT 1').get() ? true : false
  const envChecks = {
    port: Number(config.port) > 0,
    jwtSecret: Boolean(config.jwtSecret && config.jwtSecret.length >= 12),
    adminEmail: Boolean(config.adminEmail && config.adminEmail.includes('@')),
    adminPassword: Boolean(config.adminPassword && config.adminPassword.length >= 8),
    databasePath: Boolean(config.dbPath),
    allowedOrigins: Array.isArray(config.allowedOrigins) && config.allowedOrigins.length > 0,
  }

  const status = dbHealthy && Object.values(envChecks).every(Boolean) ? 'ok' : 'warning'

  upsertSystemHealth('database', dbHealthy ? 'ok' : 'critical', { message: dbHealthy ? 'Database reachable.' : 'Database unavailable.' })
  upsertSystemHealth('startup-validation', status, {
    env: envChecks,
    dbHealthy,
    supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseKey),
    timestamp: new Date().toISOString(),
  })

  return {
    status,
    database: dbHealthy ? 'ok' : 'unavailable',
    supabase: Boolean(config.supabaseUrl && config.supabaseKey) ? 'configured' : 'pending',
    storage: 'pending',
    email: 'pending',
    oauth: 'pending',
    sync: 'pending',
    backup: 'pending',
    timestamp: new Date().toISOString(),
    details: {
      env: envChecks,
      dbHealthy,
      supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseKey),
    },
  }
}

export function createBackupSnapshot(label: string) {
  const backupRoot = path.resolve(appRoot, 'data', 'backups')
  fs.mkdirSync(backupRoot, { recursive: true })

  const safeLabel = label.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase() || 'snapshot'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `${safeLabel}-${timestamp}.db`
  const backupPath = path.join(backupRoot, fileName)

  fs.copyFileSync(dbPath, backupPath)

  const metaPath = path.join(backupRoot, `${safeLabel}-${timestamp}.json`)
  fs.writeFileSync(metaPath, JSON.stringify({
    label,
    createdAt: new Date().toISOString(),
    databasePath: dbPath,
    backupPath,
    status: 'created',
  }, null, 2))

  upsertSystemHealth('backup', 'ok', { label, path: backupPath, createdAt: new Date().toISOString() })

  return {
    label,
    path: backupPath,
    metadataPath: metaPath,
    createdAt: new Date().toISOString(),
    status: 'created',
  }
}

export function getSiteSettings() {
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('site-meta') as { value: string } | undefined
  return row ? JSON.parse(row.value) : null
}
