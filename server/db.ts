import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { getSeedPayload } from './seed.js'

// ── Supabase client ───────────────────────────────────────────────────────────
let _supabase: SupabaseClient | null = null

export function getDB(): SupabaseClient {
  if (!_supabase) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
    }
    _supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _supabase
}

// Legacy alias so old `db` references compile (remove after full migration)
export const db = { supabase: () => getDB() }

function ok<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error
  return result.data as T
}

// ── Schema / startup ──────────────────────────────────────────────────────────
export async function ensureSchema() {
  // Tables are created via supabase/schema.sql — no-op here.
}

// ── Seed data ─────────────────────────────────────────────────────────────────
export async function hasSeedData(): Promise<boolean> {
  const sb = getDB()
  const { count } = await sb.from('products').select('*', { count: 'exact', head: true })
  return (count ?? 0) > 0
}

export async function seedDatabase() {
  const sb = getDB()
  const payload = getSeedPayload()

  for (const item of payload.products) {
    await sb.from('products').upsert({ id: item.id, slug: item.slug, kind: 'product', data: item, updated_at: new Date().toISOString() })
  }
  for (const item of payload.collections) {
    await sb.from('collections').upsert({ id: item.slug, slug: item.slug, data: item, updated_at: new Date().toISOString() })
  }
  for (const item of payload.galleryWorks) {
    await sb.from('gallery_works').upsert({ id: item.id, slug: item.slug, data: item, updated_at: new Date().toISOString() })
  }
  for (const item of payload.articles) {
    await sb.from('articles').upsert({ id: item.slug, slug: item.slug, data: item, updated_at: new Date().toISOString() })
  }
  for (const [slug, page] of Object.entries(payload.legalPages)) {
    await sb.from('legal_pages').upsert({ id: slug, slug, data: page, updated_at: new Date().toISOString() })
  }
  await sb.from('site_settings').upsert({
    id: 'site-meta',
    key: 'site-meta',
    value: { site: payload.site, artist: payload.artist, testimonials: payload.testimonials },
    updated_at: new Date().toISOString(),
  })
}

// ── Generic CRUD (products, collections, gallery, articles, legal) ─────────────
export async function readRows<T>(table: string): Promise<T[]> {
  const { data, error } = await getDB().from(table).select('data').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => row.data as T)
}

export async function upsertRecord<T extends object>(table: string, id: string, slug: string, data: T) {
  const sb = getDB()
  // Delete conflicting slug owned by a different id
  await sb.from(table).delete().eq('slug', slug).neq('id', id)
  await sb.from(table).upsert({ id, slug, data, updated_at: new Date().toISOString() })
}

export async function deleteRecord(table: string, id: string) {
  const sb = getDB()
  await sb.from(table).delete().eq('id', id)
  await sb.from(table).delete().eq('slug', id)
}

// ── Audit log ─────────────────────────────────────────────────────────────────
export async function createAuditLog(
  action: string,
  details: Record<string, unknown>,
  actor?: string,
  entityType?: string,
  entityId?: string,
) {
  await getDB().from('audit_logs').insert({
    id: randomUUID(),
    action,
    actor: actor ?? null,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details,
  })
}

// ── Admin user ────────────────────────────────────────────────────────────────
export async function ensureAdminUser() {
  const sb = getDB()
  const hash = bcrypt.hashSync(config.adminPassword, 10)
  await sb.from('admin_users').upsert({
    id: 'admin-1',
    email: config.adminEmail,
    password_hash: hash,
    role: 'super_admin',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' })
}

export async function getAdminUserByEmail(email: string) {
  const { data } = await getDB().from('admin_users').select('*').eq('email', email.toLowerCase()).maybeSingle()
  return data as { id: string; email: string; role: string; password_hash: string } | null
}

// ── Admin roles ───────────────────────────────────────────────────────────────
const DEFAULT_ROLES = {
  super_admin: { canEditProducts: true, canEditContent: true, canManageOrders: true, canManageCustomers: true, canManageUsers: true, canManageSettings: true },
  admin: { canEditProducts: true, canEditContent: true, canManageOrders: true, canManageCustomers: true, canManageUsers: false, canManageSettings: false },
  content_manager: { canEditProducts: false, canEditContent: true, canManageOrders: false, canManageCustomers: false, canManageUsers: false, canManageSettings: false },
  order_manager: { canEditProducts: false, canEditContent: false, canManageOrders: true, canManageCustomers: false, canManageUsers: false, canManageSettings: false },
}

export async function ensureDefaultAdminRoles() {
  const sb = getDB()
  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLES)) {
    await sb.from('admin_roles').upsert({ role_name: roleName, permissions, updated_at: new Date().toISOString() }, { onConflict: 'role_name' })
  }
  return DEFAULT_ROLES
}

export async function getAdminRolePermissions(roleName: string) {
  const { data } = await getDB().from('admin_roles').select('permissions').eq('role_name', roleName).maybeSingle()
  return data?.permissions ?? null
}

// ── Site settings ─────────────────────────────────────────────────────────────
export async function getSiteSettings() {
  const { data } = await getDB().from('site_settings').select('value').eq('key', 'site-meta').maybeSingle()
  return data?.value ?? null
}

export async function updateSiteSettings(value: Record<string, unknown>) {
  await getDB().from('site_settings').upsert({ id: 'site-meta', key: 'site-meta', value, updated_at: new Date().toISOString() })
}

// ── Site content blocks ───────────────────────────────────────────────────────
export async function upsertSiteContentBlock(blockKey: string, data: Record<string, unknown>) {
  await getDB().from('site_content_blocks').upsert({ block_key: blockKey, data, updated_at: new Date().toISOString() }, { onConflict: 'block_key' })
  return data
}

export async function getSiteContentBlock(blockKey: string) {
  const { data } = await getDB().from('site_content_blocks').select('data').eq('block_key', blockKey).maybeSingle()
  return data?.data ?? null
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function createNotification(input: {
  type: string; title: string; message: string; recipientType: string; recipientId?: string; channel: string; status?: string
}) {
  const id = randomUUID()
  await getDB().from('notifications').insert({
    id, type: input.type, title: input.title, message: input.message,
    recipient_type: input.recipientType, recipient_id: input.recipientId ?? null,
    channel: input.channel, status: input.status ?? 'queued',
  })
  return { id, ...input }
}

export async function getNotifications() {
  const { data } = await getDB().from('notifications').select('*').order('created_at', { ascending: false }).limit(100)
  return (data ?? []).map((row) => ({
    id: row.id, type: row.type, title: row.title, message: row.message,
    recipientType: row.recipient_type, recipientId: row.recipient_id,
    channel: row.channel, status: row.status, createdAt: row.created_at,
  }))
}

// ── System health ─────────────────────────────────────────────────────────────
export async function upsertSystemHealth(serviceName: string, status: string, details: Record<string, unknown> = {}) {
  await getDB().from('system_health').upsert({ service_name: serviceName, status, details, updated_at: new Date().toISOString() }, { onConflict: 'service_name' })
  return { serviceName, status, details }
}

export async function getSystemHealthSnapshot() {
  const { data } = await getDB().from('system_health').select('service_name, status, details')
  return (data ?? []).reduce<Record<string, { status: string; details: Record<string, unknown> }>>((acc, row) => {
    acc[row.service_name] = { status: row.status, details: row.details ?? {} }
    return acc
  }, {})
}

// ── Startup validation ────────────────────────────────────────────────────────
export async function runStartupValidation() {
  const envChecks = {
    port: Number(config.port) > 0,
    jwtSecret: Boolean(config.jwtSecret && config.jwtSecret.length >= 12),
    adminEmail: Boolean(config.adminEmail && config.adminEmail.includes('@')),
    adminPassword: Boolean(config.adminPassword && config.adminPassword.length >= 8),
    supabaseUrl: Boolean(config.supabaseUrl),
    supabaseKey: Boolean(config.supabaseKey),
  }

  let dbHealthy = false
  try {
    await getDB().from('admin_users').select('id').limit(1)
    dbHealthy = true
  } catch {}

  const status = dbHealthy && Object.values(envChecks).every(Boolean) ? 'ok' : 'warning'
  await upsertSystemHealth('startup-validation', status, { env: envChecks, dbHealthy, timestamp: new Date().toISOString() })

  return { status, database: dbHealthy ? 'ok' : 'unavailable', supabase: config.supabaseUrl ? 'configured' : 'pending', timestamp: new Date().toISOString(), details: { env: envChecks, dbHealthy } }
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export async function getAnalyticsSummary() {
  const sb = getDB()
  const [customersRes, ordersRes, inventoryRes, productsRes] = await Promise.all([
    sb.from('customers').select('*', { count: 'exact', head: true }),
    sb.from('orders').select('total'),
    sb.from('product_inventory').select('stock, low_stock_threshold'),
    sb.from('products').select('*', { count: 'exact', head: true }),
  ])
  const totalRevenue = ((ordersRes.data ?? []) as Array<{ total: number }>).reduce((sum, r) => sum + Number(r.total ?? 0), 0)
  const inventory = (inventoryRes.data ?? []) as Array<{ stock: number; low_stock_threshold: number }>
  const lowStockCount = inventory.filter((r) => Number(r.stock) <= Number(r.low_stock_threshold)).length
  return {
    totalCustomers: customersRes.count ?? 0,
    totalOrders: ordersRes.data?.length ?? 0,
    totalRevenue,
    totalProducts: productsRes.count ?? 0,
    inventoryCount: inventory.length,
    lowStockCount,
    updatedAt: new Date().toISOString(),
  }
}

// ── Backup (Supabase export snapshot) ────────────────────────────────────────
export async function createBackupSnapshot(label: string) {
  const sb = getDB()
  const snapshotId = randomUUID()
  const createdAt = new Date().toISOString()
  // Save a marker record in system_health
  await upsertSystemHealth('backup', 'ok', { label, snapshotId, createdAt, message: 'Supabase is the live database — no local file backup required.' })
  return { label, snapshotId, createdAt, status: 'created', message: 'Data persisted in Supabase.' }
}

// ── Media assets ──────────────────────────────────────────────────────────────
export async function setMediaAsset(asset: {
  id: string; kind: string; fileName: string; url: string; width?: number; height?: number; size?: number; metadata?: Record<string, unknown>
}) {
  await getDB().from('media_assets').upsert({
    id: asset.id, kind: asset.kind, file_name: asset.fileName, url: asset.url,
    width: asset.width ?? null, height: asset.height ?? null, size: asset.size ?? null,
    metadata: asset.metadata ?? null, updated_at: new Date().toISOString(),
  })
  return asset
}

export async function getMediaAsset(assetId: string) {
  const { data } = await getDB().from('media_assets').select('*').eq('id', assetId).maybeSingle()
  if (!data) return null
  return { id: data.id, kind: data.kind, fileName: data.file_name, url: data.url, width: data.width, height: data.height, size: data.size, metadata: data.metadata }
}

export function createMediaAssetRecord(asset: { kind: string; fileName: string; url: string; width?: number; height?: number; size?: number; metadata?: Record<string, unknown> }) {
  const id = randomUUID()
  setMediaAsset({ id, ...asset }).catch(() => {})
  return { id, ...asset }
}

// ── Page SEO meta ─────────────────────────────────────────────────────────────
export async function upsertPageSeoMeta(pageKey: string, meta: Record<string, unknown>) {
  await getDB().from('page_seo_meta').upsert({
    page_key: pageKey,
    title: meta.title ?? null, description: meta.description ?? null, canonical_url: meta.canonicalUrl ?? null,
    og_title: meta.ogTitle ?? null, og_description: meta.ogDescription ?? null, og_image: meta.ogImage ?? null,
    json_ld: meta.jsonLd ?? null, updated_at: new Date().toISOString(),
  }, { onConflict: 'page_key' })
  return meta
}

export async function getPageSeoMeta(pageKey: string) {
  const { data } = await getDB().from('page_seo_meta').select('*').eq('page_key', pageKey).maybeSingle()
  if (!data) return null
  return { pageKey: data.page_key, title: data.title, description: data.description, canonicalUrl: data.canonical_url, ogTitle: data.og_title, ogDescription: data.og_description, ogImage: data.og_image, jsonLd: data.json_ld }
}

// ── Customers ─────────────────────────────────────────────────────────────────
export async function registerCustomerAccount(input: {
  firstName: string; lastName: string; email: string; password: string; marketingConsent?: boolean
}) {
  const email = input.email.trim().toLowerCase()
  const existing = await getCustomerUserByEmail(email)
  if (existing) return null

  const id = randomUUID()
  await getDB().from('customers').insert({
    id, email, password_hash: bcrypt.hashSync(input.password, 10),
    first_name: input.firstName.trim(), last_name: input.lastName.trim(),
    marketing_consent: input.marketingConsent ?? false,
  })
  return getCustomerUserByEmail(email)
}

function mapCustomer(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    email: row.email as string,
    password_hash: row.password_hash as string,
    first_name: row.first_name as string,
    last_name: row.last_name as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    marketingConsent: Boolean(row.marketing_consent),
    created_at: row.created_at as string,
    last_login_at: row.last_login_at as string | undefined,
  }
}

export async function getCustomerUserByEmail(email: string) {
  const { data } = await getDB().from('customers').select('*').eq('email', email.trim().toLowerCase()).maybeSingle()
  return data ? mapCustomer(data) : undefined
}

export async function getCustomerById(id: string) {
  const { data } = await getDB().from('customers').select('*').eq('id', id).maybeSingle()
  return data ? mapCustomer(data) : undefined
}

export async function updateCustomerLastLogin(customerId: string) {
  await getDB().from('customers').update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', customerId)
}

export async function updateCustomerProfile(customerId: string, updates: { firstName?: string; lastName?: string; marketingConsent?: boolean }) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.firstName !== undefined) patch.first_name = updates.firstName
  if (updates.lastName !== undefined) patch.last_name = updates.lastName
  if (updates.marketingConsent !== undefined) patch.marketing_consent = updates.marketingConsent
  await getDB().from('customers').update(patch).eq('id', customerId)
  return getCustomerById(customerId)
}

// ── Customer addresses ────────────────────────────────────────────────────────
export async function getCustomerAddresses(customerId: string) {
  const { data } = await getDB().from('customer_addresses').select('data').eq('customer_id', customerId).order('created_at', { ascending: false })
  return (data ?? []).map((row) => row.data)
}

export async function upsertCustomerAddress(customerId: string, address: Record<string, unknown>) {
  const record = { ...address, id: String((address as { id?: string }).id ?? randomUUID()), customerId }
  await getDB().from('customer_addresses').upsert({
    id: record.id as string, customer_id: customerId, data: record, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  return record
}

// ── Customer cart & wishlist ───────────────────────────────────────────────────
export async function getCustomerCart(customerId: string) {
  const { data } = await getDB().from('customer_cart').select('data').eq('customer_id', customerId).maybeSingle()
  return data?.data ?? []
}

export async function setCustomerCart(customerId: string, items: unknown[]) {
  await getDB().from('customer_cart').upsert({ customer_id: customerId, data: items, updated_at: new Date().toISOString() }, { onConflict: 'customer_id' })
  return items
}

export async function getCustomerWishlist(customerId: string) {
  const { data } = await getDB().from('customer_wishlist').select('data').eq('customer_id', customerId).maybeSingle()
  return data?.data ?? []
}

export async function setCustomerWishlist(customerId: string, items: string[]) {
  await getDB().from('customer_wishlist').upsert({ customer_id: customerId, data: items, updated_at: new Date().toISOString() }, { onConflict: 'customer_id' })
  return items
}

// ── Customer data requests ────────────────────────────────────────────────────
export async function createCustomerDataRequest(customerId: string, requestType: 'export' | 'delete', reason?: string) {
  const customer = await getCustomerById(customerId)
  if (!customer) throw new Error('Customer not found.')
  const requestId = randomUUID()
  await getDB().from('customer_data_requests').insert({
    id: requestId, customer_id: customerId, request_type: requestType, reason: reason ?? null, status: 'pending', metadata: { reason: reason ?? '' },
  })
  await createAuditLog('customer_data_request_created', { customerId, requestId, requestType }, customer.email, 'customer_data_request', requestId)
  return { id: requestId, customerId, requestType, reason: reason ?? null, status: 'pending', createdAt: new Date().toISOString() }
}

export async function resolveCustomerDataRequest(requestId: string, status: 'completed' | 'rejected' | 'pending' = 'completed', metadata: Record<string, unknown> = {}) {
  const { data: row } = await getDB().from('customer_data_requests').select('*').eq('id', requestId).maybeSingle()
  if (!row) throw new Error('Data request not found.')
  await getDB().from('customer_data_requests').update({ status, resolved_at: new Date().toISOString(), metadata }).eq('id', requestId)
  if (row.request_type === 'delete' && status === 'completed') {
    await getDB().from('customers').delete().eq('id', row.customer_id)
    await createAuditLog('customer_data_request_completed_delete', { customerId: row.customer_id, requestId }, 'system', 'customer_data_request', requestId)
  }
  return { id: row.id, customerId: row.customer_id, requestType: row.request_type, reason: row.reason, status, createdAt: row.created_at, resolvedAt: new Date().toISOString() }
}

export async function createCustomerDataExport(customerId: string) {
  const customer = await getCustomerById(customerId)
  if (!customer) throw new Error('Customer not found.')
  const payload = {
    id: randomUUID(), customerId,
    profile: { id: customer.id, email: customer.email, firstName: customer.firstName, lastName: customer.lastName, marketingConsent: customer.marketingConsent, createdAt: customer.created_at ?? null, lastLoginAt: customer.last_login_at ?? null },
    addresses: await getCustomerAddresses(customerId),
    orders: await getOrdersForCustomer(customerId),
    cart: await getCustomerCart(customerId),
    wishlist: await getCustomerWishlist(customerId),
    exportedAt: new Date().toISOString(),
  }
  await createAuditLog('customer_data_export_created', { customerId, exportId: payload.id }, customer.email, 'customer', customerId)
  return payload
}

// ── Product inventory ─────────────────────────────────────────────────────────
export async function getInventorySnapshot(productId: string) {
  const { data } = await getDB().from('product_inventory').select('stock, low_stock_threshold').eq('product_id', productId).maybeSingle()
  const stock = Number(data?.stock ?? 0)
  const threshold = Number(data?.low_stock_threshold ?? 5)
  return { productId, stock, lowStockThreshold: threshold, lowStock: stock <= threshold }
}

export async function setProductInventory(productId: string, cfg: { stock: number; lowStockThreshold?: number }) {
  await getDB().from('product_inventory').upsert({
    product_id: productId, stock: Number(cfg.stock), low_stock_threshold: Number(cfg.lowStockThreshold ?? 5), updated_at: new Date().toISOString(),
  }, { onConflict: 'product_id' })
  return getInventorySnapshot(productId)
}

// ── Orders ────────────────────────────────────────────────────────────────────
function mapOrder(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    shippingAddressId: row.shipping_address_id as string | null,
    status: row.status as string,
    paymentProvider: row.payment_provider as string,
    paymentStatus: row.payment_status as string,
    note: row.note as string | null,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal ?? 0),
    shippingTotal: Number(row.shipping_total ?? 0),
    total: Number(row.total ?? 0),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    locationAccuracy: row.location_accuracy as number | null,
    locationUrl: row.location_url as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function getOrdersForCustomer(customerId: string) {
  const { data } = await getDB().from('orders').select('*').eq('customer_id', customerId).order('created_at', { ascending: false })
  return (data ?? []).map(mapOrder)
}

export async function getOrderById(orderId: string) {
  const { data } = await getDB().from('orders').select('*').eq('id', orderId).maybeSingle()
  return data ? mapOrder(data) : null
}

export async function getAllOrdersForAdmin() {
  const { data } = await getDB().from('orders').select('*, customers(email, first_name, last_name)').order('created_at', { ascending: false })
  return (data ?? []).map((row: Record<string, unknown>) => {
    const cust = (row.customers as { email?: string; first_name?: string; last_name?: string } | null) ?? {}
    return {
      ...mapOrder(row),
      customerEmail: cust.email ?? null,
      customerName: cust.first_name && cust.last_name ? `${cust.first_name} ${cust.last_name}`.trim() : (cust.email ?? 'Unknown customer'),
    }
  })
}

export async function updateOrderStatus(orderId: string, status: string) {
  await getDB().from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId)
  return getOrderById(orderId)
}

export async function createOrderFromCart(customerId: string, input: {
  shippingAddressId?: string; paymentProvider?: string; paymentStatus?: string; note?: string;
  items?: Array<{ id: string; slug?: string; name?: string; price?: number; quantity?: number; image?: string; currency?: string; [k: string]: unknown }>;
  buyer?: { email?: string; phone?: string; age?: number | string; location?: string; address?: string; deliveryDate?: string; deliveryTime?: string; notes?: string; latitude?: number; longitude?: number; location_accuracy?: number; location_url?: string; [k: string]: unknown };
}) {
  const sb = getDB()
  let cart: Array<Record<string, unknown>>
  if (Array.isArray(input.items) && input.items.length > 0) {
    cart = input.items as Array<Record<string, unknown>>
  } else {
    cart = (await getCustomerCart(customerId)) as Array<Record<string, unknown>>
  }
  if (!Array.isArray(cart) || cart.length === 0) throw new Error('Cart is empty.')

  let subtotal = 0
  const items: Array<{ id: string; slug: string; name: string; quantity: number; price: number; currency: string; image: string }> = []

  for (const entry of cart) {
    const productId = String(entry.id)
    const quantity = Number(entry.quantity ?? 1)
    let price = Number(entry.price ?? 0)
    let name = entry.name ? String(entry.name) : ''
    let image = entry.image ? String(entry.image) : (Array.isArray(entry.images) ? String(entry.images[0]) : '')

    const { data: prodRow } = await sb.from('products').select('data').or(`id.eq.${productId},slug.eq.${productId}`).maybeSingle()
    if (prodRow?.data) {
      const p = prodRow.data as Record<string, unknown>
      if (p.availability === 'sold') {
        throw new Error(`Artwork "${p.name || name || productId}" has already been sold and cannot be ordered.`)
      }
      name = name || String(p.name ?? productId)
      image = image || (Array.isArray(p.images) ? String(p.images[0]) : '') || String(p.image ?? '')
      price = price || Number(p.price ?? 0)
    }
    if (!name) name = productId

    const inv = await getInventorySnapshot(productId)
    if (inv.stock < quantity) {
      await setProductInventory(productId, { stock: Math.max(50, quantity + 10), lowStockThreshold: 5 })
    }

    subtotal += price * quantity
    items.push({ id: productId, slug: String(entry.slug ?? productId), name, quantity, price, currency: String(entry.currency ?? 'NRS'), image })
  }

  const shippingTotal = 0
  const total = subtotal + shippingTotal
  const orderId = randomUUID()
  const customer = await getCustomerById(customerId)
  const metadata = { ...(input.buyer ?? {}), email: input.buyer?.email ?? customer?.email ?? '' }
  const latitude = typeof input.buyer?.latitude === 'number' ? input.buyer.latitude : null
  const longitude = typeof input.buyer?.longitude === 'number' ? input.buyer.longitude : null
  const locationAccuracy = typeof input.buyer?.location_accuracy === 'number' ? input.buyer.location_accuracy : null
  const locationUrl = typeof input.buyer?.location_url === 'string' ? input.buyer.location_url : (latitude !== null && longitude !== null ? `https://www.google.com/maps?q=${latitude},${longitude}` : null)

  await sb.from('orders').insert({
    id: orderId, customer_id: customerId, shipping_address_id: input.shippingAddressId ?? null,
    status: input.paymentStatus === 'paid' ? 'paid' : 'pending',
    payment_provider: input.paymentProvider ?? 'manual', payment_status: input.paymentStatus ?? 'pending',
    note: input.note ?? null, metadata, latitude, longitude, location_accuracy: locationAccuracy, location_url: locationUrl,
    items, subtotal, shipping_total: shippingTotal, total,
  })

  for (const item of items) {
    const current = await getInventorySnapshot(item.id)
    await setProductInventory(item.id, { stock: Math.max(0, current.stock - item.quantity), lowStockThreshold: current.lowStockThreshold })
  }

  await sb.from('order_events').insert({ id: randomUUID(), order_id: orderId, event: 'created', details: { items, total, paymentStatus: input.paymentStatus ?? 'pending', metadata } })
  await sb.from('customer_cart').delete().eq('customer_id', customerId)

  return (await getOrderById(orderId))!
}

export async function updateCustomerOrder(orderId: string, customerId: string, updates: {
  deliveryDate?: string; deliveryTime?: string; address?: string; notes?: string; phone?: string; name?: string; status?: string
}) {
  const order = await getOrderById(orderId)
  if (!order) throw new Error('Order not found.')
  if (order.customerId !== customerId) throw new Error('Unauthorized to modify this order.')

  const newMeta = {
    ...order.metadata,
    ...(updates.deliveryDate ? { deliveryDate: updates.deliveryDate } : {}),
    ...(updates.deliveryTime ? { deliveryTime: updates.deliveryTime } : {}),
    ...(updates.address ? { address: updates.address, location: updates.address } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    ...(updates.phone ? { phone: updates.phone } : {}),
    ...(updates.name ? { name: updates.name } : {}),
  }
  const newStatus = updates.status || order.status
  await getDB().from('orders').update({ metadata: newMeta, status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId)
  await getDB().from('order_events').insert({ id: randomUUID(), order_id: orderId, event: newStatus === 'cancelled' ? 'cancelled' : 'updated', details: { updates, metadata: newMeta, status: newStatus } })
  return getOrderById(orderId)
}

export async function cancelCustomerOrder(orderId: string, customerId: string, reason = 'Cancelled by customer') {
  const order = await getOrderById(orderId)
  if (!order) throw new Error('Order not found.')
  if (order.customerId !== customerId) throw new Error('Unauthorized to cancel this order.')
  if (order.status === 'cancelled') throw new Error('Order is already cancelled.')

  const meta = { ...order.metadata, cancellationReason: reason, cancelledAt: new Date().toISOString() }
  await getDB().from('orders').update({ status: 'cancelled', metadata: meta, updated_at: new Date().toISOString() }).eq('id', orderId)

  try {
    for (const item of order.items as Array<{ id: string; quantity: number }>) {
      if (item.id && item.quantity) {
        const current = await getInventorySnapshot(item.id)
        await setProductInventory(item.id, { stock: current.stock + item.quantity, lowStockThreshold: current.lowStockThreshold })
      }
    }
  } catch {}

  await getDB().from('order_events').insert({ id: randomUUID(), order_id: orderId, event: 'cancelled', details: { reason, metadata: meta } })
  return getOrderById(orderId)
}

// ── Payment attempts ──────────────────────────────────────────────────────────
export async function createPaymentAttempt(input: {
  orderId: string; customerId: string; provider?: string; amount: number; currency?: string;
  status?: 'pending' | 'paid' | 'failed' | 'refunded'; gateway?: string; reference?: string; metadata?: Record<string, unknown>
}) {
  const paymentId = randomUUID()
  await getDB().from('payment_attempts').insert({
    id: paymentId, order_id: input.orderId, customer_id: input.customerId,
    provider: input.provider ?? 'manual', amount: Number(input.amount), currency: input.currency ?? 'NRS',
    status: input.status ?? 'pending', gateway: input.gateway ?? null, reference: input.reference ?? null,
    metadata: input.metadata ?? {},
  })
  await createAuditLog('payment_attempt_created', { paymentId, orderId: input.orderId, status: input.status ?? 'pending' }, 'system', 'payment_attempt', paymentId)
  return { id: paymentId, orderId: input.orderId, customerId: input.customerId, provider: input.provider ?? 'manual', amount: Number(input.amount), currency: input.currency ?? 'NRS', status: input.status ?? 'pending', gateway: input.gateway ?? null, reference: input.reference ?? null, metadata: input.metadata ?? {}, createdAt: new Date().toISOString() }
}

export async function updatePaymentAttemptStatus(paymentId: string, status: 'pending' | 'paid' | 'failed' | 'refunded', metadata: Record<string, unknown> = {}) {
  const { data: row } = await getDB().from('payment_attempts').select('*').eq('id', paymentId).maybeSingle()
  if (!row) throw new Error('Payment attempt not found.')
  await getDB().from('payment_attempts').update({ status, metadata, updated_at: new Date().toISOString() }).eq('id', paymentId)
  await createAuditLog('payment_attempt_updated', { paymentId, orderId: row.order_id, status }, 'system', 'payment_attempt', paymentId)
  return { id: row.id, orderId: row.order_id, customerId: row.customer_id, provider: row.provider, amount: Number(row.amount), currency: row.currency, status, gateway: row.gateway, reference: row.reference, metadata, createdAt: row.created_at }
}

// ── Commission enquiries ──────────────────────────────────────────────────────
export async function createCommissionEnquiry(input: { name: string; email: string; country: string; budget: string; description: string }) {
  const id = randomUUID()
  await getDB().from('commission_enquiries').insert({
    id, name: input.name.trim(), email: input.email.trim().toLowerCase(),
    country: input.country.trim(), budget: input.budget.trim(), description: input.description.trim(), status: 'new',
  })
  return getCommissionEnquiryById(id)
}

export async function getCommissionEnquiryById(id: string) {
  const { data } = await getDB().from('commission_enquiries').select('*').eq('id', id).maybeSingle()
  return data
}

export async function getAllCommissionEnquiries() {
  const { data } = await getDB().from('commission_enquiries').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function updateCommissionEnquiryStatus(id: string, status: string, notes?: string) {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (notes !== undefined) patch.notes = notes
  await getDB().from('commission_enquiries').update(patch).eq('id', id)
  return getCommissionEnquiryById(id)
}

// ── Events ────────────────────────────────────────────────────────────────────
export async function getAllEvents() {
  const { data } = await getDB().from('events').select('*').order('date', { ascending: false })
  return data ?? []
}

export async function getEventById(id: string) {
  const { data } = await getDB().from('events').select('*').eq('id', id).maybeSingle()
  return data
}

export async function upsertEvent(input: {
  id?: string; title: string; slug: string; date: string; time?: string; description: string; image?: string; entryFee?: string; location?: string; status?: string
}) {
  const id = input.id || randomUUID()
  await getDB().from('events').upsert({
    id, title: input.title.trim(), slug: input.slug.trim(), date: input.date, time: input.time ?? null,
    description: input.description.trim(), image: input.image ?? null, entry_fee: input.entryFee ?? null,
    location: input.location ?? null, status: input.status ?? 'upcoming', updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  return getEventById(id)
}

export async function deleteEvent(id: string) {
  await getDB().from('events').delete().eq('id', id)
}

// ── Monitoring helpers (kept for compatibility) ───────────────────────────────
export async function ensureMonitoringTables() { /* no-op — tables exist in Supabase */ }
export async function ensureMediaSeoTables() { /* no-op — tables exist in Supabase */ }
export async function ensureDefaultAdminRolesAlias() { return ensureDefaultAdminRoles() }

// ── Customer data requests (admin) ─────────────────────────────────────────────
export async function getAllCustomerDataRequests() {
  const { data } = await getDB().from('customer_data_requests').select('*').order('created_at', { ascending: false })
  return (data ?? []).map((row) => ({
    id: row.id, customerId: row.customer_id, requestType: row.request_type, reason: row.reason,
    status: row.status, createdAt: row.created_at, resolvedAt: row.resolved_at, metadata: row.metadata ?? {},
  }))
}
