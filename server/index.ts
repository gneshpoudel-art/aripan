import cors from 'cors'
import express from 'express'
import multer from 'multer'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { ensureStorageBucket, uploadToStorage } from './storage.js'
import { createRestorePlan, generateDeploymentChecklist, getRecoveryStatus, verifyRecoveryPlan } from './deploy-readiness.js'
import { createMediaAssetRecord, optimizeMediaPayload, validateMediaUpload } from './media-pipeline.js'
import { buildGoogleOAuthUrl, decodeJwtPayload, exchangeGoogleCode, getGoogleUserInfo, getProviderHealthSnapshot } from './providers.js'
import {
  createAuditLog, createCustomerDataExport, createCustomerDataRequest, createPaymentAttempt,
  deleteRecord, ensureAdminUser, ensureSchema, getAdminUserByEmail, getAllOrdersForAdmin,
  getCustomerById, getCustomerUserByEmail, getSiteSettings, hasSeedData, readRows,
  registerCustomerAccount, resolveCustomerDataRequest, seedDatabase, updateOrderStatus, upsertRecord,
  createCommissionEnquiry, getAllCommissionEnquiries, updateCommissionEnquiryStatus,
  getAllEvents, upsertEvent, deleteEvent,
  getCustomerAddresses, upsertCustomerAddress, getCustomerCart, setCustomerCart,
  getCustomerWishlist, setCustomerWishlist, updateCustomerLastLogin, updateCustomerProfile,
  createOrderFromCart, getOrdersForCustomer, updateCustomerOrder, cancelCustomerOrder,
  updatePaymentAttemptStatus, ensureDefaultAdminRoles, getAdminRolePermissions,
  getSiteContentBlock, upsertSiteContentBlock, getNotifications, getSystemHealthSnapshot,
  runStartupValidation, getAnalyticsSummary, createBackupSnapshot, getMediaAsset,
  getPageSeoMeta, upsertPageSeoMeta, upsertSystemHealth, getAllCustomerDataRequests,
  setMediaAsset, createNotification,
} from './db.js'

// ── Multer: use /tmp in production (Vercel) or data/media locally ──────────────
const mediaDir = process.env.VERCEL ? '/tmp/uploads' : 'data/media'
if (!process.env.VERCEL) {
  try { fs.mkdirSync(path.resolve(process.cwd(), 'data', 'media'), { recursive: true }) } catch {}
}
const upload = multer({ dest: mediaDir })
const app = express()

// Only resolve __dirname / publicRoot when NOT on Vercel (no __dirname there)
let publicRoot = ''
let adminRoot = ''
let distRoot = ''
let distIndex = ''
try {
  const __dirnameVal = path.dirname(fileURLToPath(import.meta.url))
  publicRoot = path.resolve(__dirnameVal, '../public')
  adminRoot = path.resolve(__dirnameVal, '../public/aripan-admin-secure')
  distRoot = path.resolve(__dirnameVal, '../dist')
  distIndex = path.join(distRoot, 'index.html')
} catch {}

// ── Schemas ───────────────────────────────────────────────────────────────────
const productSchema = z.object({
  id: z.string().min(1), slug: z.string().min(1), name: z.string().min(1),
  collections: z.array(z.string()).default([]), images: z.array(z.string()),
  createdAt: z.string(), price: z.number(), currency: z.string().default('NRS'),
  availability: z.string(), medium: z.string(), dimensions: z.string(),
  year: z.number(), description: z.string(), story: z.string(),
  details: z.array(z.string()), shipping: z.string(), returns: z.string(),
  sku: z.string(), featured: z.boolean().default(false), bestSeller: z.boolean().default(false),
  motifs: z.array(z.string()),
})
const collectionSchema = z.object({
  slug: z.string().min(1), name: z.string().min(1), short: z.string(),
  description: z.string(), image: z.string(), hero: z.string(),
})
const gallerySchema = z.object({
  id: z.string().min(1), slug: z.string().min(1), title: z.string().min(1),
  year: z.number(), image: z.string(), medium: z.string(), size: z.string(),
  motifs: z.array(z.string()), story: z.string(), productSlug: z.string().optional(),
})
const articleSchema = z.object({
  slug: z.string().min(1), title: z.string().min(1), excerpt: z.string(),
  date: z.string(), readMinutes: z.number(), image: z.string(),
  tags: z.array(z.string()), body: z.array(z.string()),
})
const legalSchema = z.object({
  title: z.string(), updated: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
})
const adminLoginSchema = z.object({ email: z.string().email(), password: z.string().min(6) })
const buyerDetailsSchema = z.object({
  email: z.string().email().optional(), phone: z.string().min(1).optional(),
  age: z.union([z.number(), z.string()]).optional(), name: z.string().optional(),
  address: z.string().optional(), location: z.string().optional(),
  deliveryDate: z.string().min(1).optional(), deliveryTime: z.string().min(1).optional(),
  notes: z.string().optional(), latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location_accuracy: z.number().optional(), location_url: z.string().url().optional(),
}).passthrough()
const customerAccountSchema = z.object({
  firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(),
  password: z.string().min(8), marketingConsent: z.boolean().optional().default(false),
})
const customerLoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })
const customerAddressSchema = z.object({
  id: z.string().optional(), label: z.string().min(1), firstName: z.string().min(1),
  lastName: z.string().min(1), line1: z.string().min(1), line2: z.string().optional(),
  city: z.string().min(1), state: z.string().min(1), postalCode: z.string().min(1),
  country: z.string().min(1), phone: z.string().min(1),
})

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: config.allowedOrigins, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use('/api', rateLimit({ windowMs: 60_000, max: 180 }))

// ── Auth helpers ──────────────────────────────────────────────────────────────
function signToken(email: string, role: 'super_admin' | 'customer') {
  return jwt.sign({ email, role }, config.jwtSecret, { expiresIn: '12h' })
}
function authRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { email: string; role: 'super_admin' | 'customer' }
    req.user = { email: decoded.email, role: decoded.role }
    return next()
  } catch { return res.status(401).json({ error: 'Invalid or expired token.' }) }
}
function customerAuthRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentication required.' })
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { email: string; role: 'super_admin' | 'customer' }
    if (decoded.role !== 'customer') return res.status(403).json({ error: 'Customer account required.' })
    req.user = { email: decoded.email, role: decoded.role }
    return next()
  } catch { return res.status(401).json({ error: 'Invalid or expired token.' }) }
}
function withAdminUser<T extends express.Request>(req: T) {
  return req.user as { email: string; role?: string } | undefined
}

// ── Email notification (unchanged) ────────────────────────────────────────────
function sendOrderNotification(
  order: { id: string; customerId?: string; total?: number; items?: Array<{ id: string; name?: string; slug?: string; price?: number; quantity?: number; image?: string; currency?: string }>; metadata?: Record<string, unknown>; locationUrl?: string | null; latitude?: number | null; longitude?: number | null; locationAccuracy?: number | null; status?: string },
  customerEmail: string,
  action: 'created' | 'updated' | 'cancelled' = 'created',
) {
  const { emailJsPublicKey, emailJsServiceId, emailJsTemplateId, adminEmail } = config
  if (!emailJsPublicKey || !emailJsServiceId || !emailJsTemplateId) {
    console.warn('[EmailJS] Not configured — order saved to database.')
    return
  }
  const metadata = order.metadata ?? {}
  const items = Array.isArray(order.items) ? order.items : []
  const itemsSummary = items.length > 0
    ? items.map((i, idx) => `${idx + 1}. ${i.name || i.slug || i.id} (Qty: ${i.quantity || 1}, Price: NRS ${Number(i.price || 0).toLocaleString()})`).join('\n')
    : 'No items detailed'
  const firstItem = items[0] || {}
  const locUrl = order.locationUrl ?? (metadata.location_url as string | undefined) ?? (order.latitude && order.longitude ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : '')
  const actionText = action === 'cancelled' ? 'ORDER CANCELLED BY CUSTOMER' : (action === 'updated' ? 'ORDER DETAILS UPDATED BY CUSTOMER' : 'NEW ORDER ENQUIRY')
  const payload = {
    service_id: emailJsServiceId, template_id: emailJsTemplateId, user_id: emailJsPublicKey,
    template_params: {
      to_email: adminEmail || customerEmail, admin_email: adminEmail || 'admin@aripan.art',
      order_action: actionText, action: actionText, order_status: order.status || 'pending',
      customer_email: customerEmail, customer_name: (metadata.name as string | undefined) ?? customerEmail,
      customer_age: (metadata.age as string | number | undefined) ?? '', phone: (metadata.phone as string | undefined) ?? '',
      delivery_date: (metadata.deliveryDate as string | undefined) ?? '', delivery_time: (metadata.deliveryTime as string | undefined) ?? '',
      address: (metadata.address as string | undefined) ?? (metadata.location as string | undefined) ?? '',
      notes: (metadata.notes as string | undefined) ?? '', order_id: order.id,
      order_total: Number(order.total ?? 0), order_total_formatted: `NRS ${Number(order.total ?? 0).toLocaleString()}`,
      currency: 'NRS', items_summary: itemsSummary, items: JSON.stringify(items),
      product_name: firstItem.name || firstItem.slug || '', product_price: firstItem.price != null ? `NRS ${Number(firstItem.price).toLocaleString()}` : '',
      product_image: firstItem.image || '', location_url: locUrl,
      latitude: order.latitude ?? '', longitude: order.longitude ?? '',
      location_accuracy: order.locationAccuracy ?? '',
    },
  }
  fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(async (r) => {
    if (r.ok) console.log(`[EmailJS] Notification (${action}) sent for order ${order.id}`)
    else console.error(`[EmailJS] Failed: HTTP ${r.status} - ${await r.text().catch(() => '')}`)
  }).catch((err) => console.error('[EmailJS] Network error:', err))
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const providerHealth = getProviderHealthSnapshot()
  const siteSettings = await getSiteSettings().catch(() => null)
  res.json({
    status: 'ok', service: 'aripan-api', database: 'supabase',
    timestamp: new Date().toISOString(),
    supabaseConfigured: providerHealth.supabaseConfigured,
    googleConfigured: providerHealth.googleConfigured,
    sync: { configured: providerHealth.supabaseConfigured, status: 'ok', queueLength: 0 },
    site: siteSettings ? 'configured' : 'pending',
  })
})

// ── Supabase sync (legacy shim) ───────────────────────────────────────────────
app.get('/api/supabase/sync-status', (_req, res) => res.json({ configured: true, status: 'ok', message: 'Supabase is the live database.' }))
app.post('/api/supabase/sync', (_req, res) => res.json({ status: 'ok', message: 'Supabase is the live database — no sync needed.' }))

// ── Google OAuth ──────────────────────────────────────────────────────────────
app.get('/api/auth/google', (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : 'aripan-google-auth'
  const redirectUri = typeof req.query.redirectUri === 'string' ? req.query.redirectUri : undefined
  return res.json({ url: buildGoogleOAuthUrl(state, redirectUri), configured: Boolean(process.env.GOOGLE_CLIENT_ID) })
})

app.post('/api/auth/google/callback', async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : ''
  const redirectUri = typeof req.body?.redirectUri === 'string' ? req.body.redirectUri : process.env.GOOGLE_REDIRECT_URI
  if (!code) return res.status(400).json({ error: 'Google authorization code is required.' })
  const exchange = await exchangeGoogleCode(code, redirectUri)
  if (!exchange.configured) return res.status(501).json({ error: exchange.error })
  if ('error' in exchange && exchange.error) return res.status(400).json({ error: exchange.error })
  const tokenPayload = exchange.tokens?.id_token ? decodeJwtPayload(exchange.tokens.id_token) : null
  const userInfo = exchange.tokens?.access_token ? await getGoogleUserInfo(exchange.tokens.access_token) : null
  const email = (tokenPayload?.email ?? userInfo?.email ?? '').toLowerCase()
  if (!email) return res.status(400).json({ error: 'Google account email could not be determined.' })
  let customer = await getCustomerUserByEmail(email)
  if (!customer) {
    customer = await registerCustomerAccount({
      firstName: tokenPayload?.given_name ?? userInfo?.given_name ?? email.split('@')[0] ?? 'Customer',
      lastName: tokenPayload?.family_name ?? userInfo?.family_name ?? 'Google',
      email, password: `google-oauth-${Math.random().toString(36).slice(2)}-${Date.now()}`, marketingConsent: false,
    }) ?? undefined
  }
  if (!customer) return res.status(500).json({ error: 'Customer account could not be created from Google sign-in.' })
  await createAuditLog('google_oauth_login', { email }, customer.email, 'customer', customer.id)
  return res.json({ token: signToken(customer.email, 'customer'), user: { id: customer.id, email: customer.email, firstName: customer.firstName, lastName: customer.lastName, marketingConsent: customer.marketingConsent, role: 'customer' } })
})

// ── Admin login ───────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid login payload.' })
  const user = await getAdminUserByEmail(parsed.data.email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' })
  const valid = await bcrypt.compare(parsed.data.password, user.password_hash)
  if (!valid) {
    await createAuditLog('admin_login_failed', { email: parsed.data.email }, parsed.data.email, 'admin_user', user.id)
    return res.status(401).json({ error: 'Invalid credentials.' })
  }
  await createAuditLog('admin_login_success', { email: parsed.data.email }, parsed.data.email, 'admin_user', user.id)
  return res.json({ token: signToken(user.email, 'super_admin'), user: { email: user.email, role: user.role } })
})

// ── Customer auth ─────────────────────────────────────────────────────────────
app.post('/api/customers/register', async (req, res) => {
  const parsed = customerAccountSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const created = await registerCustomerAccount({ firstName: parsed.data.firstName, lastName: parsed.data.lastName, email: parsed.data.email, password: parsed.data.password, marketingConsent: parsed.data.marketingConsent })
  const user = created ?? await getCustomerUserByEmail(parsed.data.email)
  if (!user) return res.status(409).json({ error: 'An account with this email already exists.' })
  await createAuditLog('customer_registered', { email: user.email }, user.email, 'customer', user.id)
  return res.status(201).json({ token: signToken(user.email, 'customer'), user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, marketingConsent: user.marketingConsent, role: 'customer' } })
})

app.post('/api/customers/login', async (req, res) => {
  const parsed = customerLoginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const user = await getCustomerUserByEmail(parsed.data.email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' })
  const valid = await bcrypt.compare(parsed.data.password, user.password_hash)
  if (!valid) {
    await createAuditLog('customer_login_failed', { email: parsed.data.email }, parsed.data.email, 'customer', user.id)
    return res.status(401).json({ error: 'Invalid credentials.' })
  }
  await updateCustomerLastLogin(user.id)
  await createAuditLog('customer_login_success', { email: user.email }, user.email, 'customer', user.id)
  return res.json({ token: signToken(user.email, 'customer'), user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, marketingConsent: user.marketingConsent, role: 'customer' } })
})

app.get('/api/customers/me', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json({
    id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, marketingConsent: user.marketingConsent, role: 'customer',
    addresses: await getCustomerAddresses(user.id),
    cart: await getCustomerCart(user.id),
    wishlist: await getCustomerWishlist(user.id),
  })
})

app.put('/api/customers/me', customerAuthRequired, async (req, res) => {
  const current = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!current) return res.status(404).json({ error: 'Customer not found.' })
  const next = z.object({ firstName: z.string().min(1).optional(), lastName: z.string().min(1).optional(), marketingConsent: z.boolean().optional() }).safeParse(req.body)
  if (!next.success) return res.status(400).json({ error: next.error.issues })
  const result = await updateCustomerProfile(current.id, next.data)
  return res.json({ id: result?.id, email: result?.email, firstName: result?.firstName, lastName: result?.lastName, marketingConsent: result?.marketingConsent, role: 'customer' })
})

app.get('/api/customers/addresses', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json(await getCustomerAddresses(user.id))
})

app.post('/api/customers/addresses', customerAuthRequired, async (req, res) => {
  const parsed = customerAddressSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  const item = await upsertCustomerAddress(user.id, parsed.data)
  await createAuditLog('customer_address_updated', { customerId: user.id, label: (item as Record<string, unknown>).label }, user.email, 'customer_address', String((item as Record<string, unknown>).id))
  return res.status(201).json(item)
})

app.get('/api/customers/cart', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json(await getCustomerCart(user.id))
})

app.put('/api/customers/cart', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  const items = Array.isArray(req.body) ? req.body : []
  const value = await setCustomerCart(user.id, items)
  await createAuditLog('customer_cart_updated', { customerId: user.id, count: items.length }, user.email, 'customer_cart', user.id)
  return res.json(value)
})

app.get('/api/customers/wishlist', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json(await getCustomerWishlist(user.id))
})

app.put('/api/customers/wishlist', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  const items = Array.isArray(req.body) ? req.body.map((v) => String(v)) : []
  const value = await setCustomerWishlist(user.id, items)
  await createAuditLog('customer_wishlist_updated', { customerId: user.id, count: items.length }, user.email, 'customer_wishlist', user.id)
  return res.json(value)
})

// ── Orders ────────────────────────────────────────────────────────────────────
const orderItemSchema = z.object({ id: z.string().min(1), slug: z.string().optional(), name: z.string().optional(), price: z.number().optional(), quantity: z.number().default(1), image: z.string().optional(), currency: z.string().optional() })

app.post('/api/orders/checkout', customerAuthRequired, async (req, res) => {
  try {
    const user = await getCustomerUserByEmail((req.user as { email: string }).email)
    if (!user) return res.status(404).json({ error: 'Customer not found.' })
    const payload = z.object({
      shippingAddressId: z.string().optional(), paymentProvider: z.string().default('manual'),
      paymentStatus: z.enum(['pending', 'paid', 'failed']).default('pending'),
      note: z.string().optional(), buyer: buyerDetailsSchema.optional(), items: z.array(orderItemSchema).optional(),
    }).safeParse(req.body)
    if (!payload.success) return res.status(400).json({ error: payload.error.issues })
    const order = await createOrderFromCart(user.id, payload.data)
    await createAuditLog('order_created', { orderId: order.id, customerId: user.id, buyer: order.metadata }, user.email, 'order', order.id)
    sendOrderNotification(order, user.email, 'created')
    return res.status(201).json(order)
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Order could not be created.' }) }
})

app.get('/api/orders/me', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json(await getOrdersForCustomer(user.id))
})

app.patch('/api/orders/:id', customerAuthRequired, async (req, res) => {
  try {
    const user = await getCustomerUserByEmail((req.user as { email: string }).email)
    if (!user) return res.status(404).json({ error: 'Customer not found.' })
    const parsed = z.object({ deliveryDate: z.string().optional(), deliveryTime: z.string().optional(), address: z.string().optional(), notes: z.string().optional(), phone: z.string().optional(), name: z.string().optional(), status: z.enum(['pending', 'cancelled']).optional() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
    const updated = await updateCustomerOrder(req.params.id, user.id, parsed.data)
    await createAuditLog('customer_order_updated', { orderId: req.params.id, updates: parsed.data }, user.email, 'order', req.params.id)
    if (updated) sendOrderNotification(updated, user.email, parsed.data.status === 'cancelled' ? 'cancelled' : 'updated')
    return res.json(updated)
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not update order.' }) }
})

app.post('/api/orders/:id/cancel', customerAuthRequired, async (req, res) => {
  try {
    const user = await getCustomerUserByEmail((req.user as { email: string }).email)
    if (!user) return res.status(404).json({ error: 'Customer not found.' })
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'Cancelled by customer'
    const updated = await cancelCustomerOrder(req.params.id, user.id, reason)
    await createAuditLog('customer_order_cancelled', { orderId: req.params.id, reason }, user.email, 'order', req.params.id)
    if (updated) sendOrderNotification(updated, user.email, 'cancelled')
    return res.json(updated)
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not cancel order.' }) }
})

app.get('/api/customers/data/export', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json(await createCustomerDataExport(user.id))
})

app.post('/api/customers/data-request', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  const parsed = z.object({ requestType: z.enum(['export', 'delete']), reason: z.string().optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const request = await createCustomerDataRequest(user.id, parsed.data.requestType, parsed.data.reason)
  await createAuditLog('customer_data_request_submitted', { customerId: user.id, requestId: request.id }, user.email, 'customer_data_request', request.id)
  return res.status(201).json(request)
})

// ── Payments ──────────────────────────────────────────────────────────────────
app.post('/api/orders/:orderId/payments', customerAuthRequired, async (req, res) => {
  const user = await getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  const parsed = z.object({ provider: z.string().default('manual'), amount: z.number().min(0), currency: z.string().default('NRS'), status: z.enum(['pending', 'paid', 'failed', 'refunded']).default('pending'), gateway: z.string().optional(), reference: z.string().optional(), metadata: z.record(z.unknown()).optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const attempt = await createPaymentAttempt({ orderId: req.params.orderId, customerId: user.id, provider: parsed.data.provider, amount: parsed.data.amount, currency: parsed.data.currency, status: parsed.data.status, gateway: parsed.data.gateway, reference: parsed.data.reference, metadata: parsed.data.metadata ?? {} })
  return res.status(201).json(attempt)
})

app.patch('/api/payments/attempts/:id', authRequired, async (req, res) => {
  const parsed = z.object({ status: z.enum(['pending', 'paid', 'failed', 'refunded']), metadata: z.record(z.unknown()).optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const attempt = await updatePaymentAttemptStatus(req.params.id, parsed.data.status, parsed.data.metadata ?? {})
  await createAuditLog('payment_attempt_status_updated', { paymentId: req.params.id, status: parsed.data.status }, withAdminUser(req)?.email, 'payment_attempt', req.params.id)
  return res.json(attempt)
})

// ── Admin CMS ─────────────────────────────────────────────────────────────────
app.get('/api/admin/roles', authRequired, async (_req, res) => {
  const defaultRoles = await ensureDefaultAdminRoles()
  res.json(Object.fromEntries(Object.entries(defaultRoles).map(([rn, p]) => [rn, { ...p, canManageUsers: Boolean((p as Record<string, unknown>).canManageUsers) }])))
})

app.get('/api/admin/content/blocks/:key', authRequired, async (req, res) => {
  const raw = await getSiteContentBlock(req.params.key)
  return res.json({ key: req.params.key, data: raw ?? {} })
})

app.put('/api/admin/content/blocks/:key', authRequired, async (req, res) => {
  const payload = req.body ?? {}
  await upsertSiteContentBlock(req.params.key, payload)
  await createAuditLog('content_block_updated', { key: req.params.key }, withAdminUser(req)?.email, 'content_block', req.params.key)
  return res.json({ ok: true, key: req.params.key, data: payload })
})

app.get('/api/admin/notifications', authRequired, async (_req, res) => {
  return res.json(await getNotifications())
})

app.get('/api/admin/health', authRequired, async (_req, res) => {
  const health = await getSystemHealthSnapshot()
  const startup = await runStartupValidation()
  return res.json({ startup, health, recovery: getRecoveryStatus(), deploymentChecklist: generateDeploymentChecklist({ frontendHost: 'render', backendHost: 'vercel', environment: config.nodeEnv }) })
})

app.get('/api/admin/recovery/plan', authRequired, async (_req, res) => {
  const environment = config.nodeEnv === 'production' ? 'production' : 'staging'
  const plan = createRestorePlan(environment)
  return res.json({ plan, verification: verifyRecoveryPlan(plan), recovery: getRecoveryStatus() })
})

app.get('/api/admin/analytics/summary', authRequired, async (_req, res) => {
  return res.json(await getAnalyticsSummary())
})

app.post('/api/admin/backups/create', authRequired, async (req, res) => {
  const label = typeof req.body?.label === 'string' ? req.body.label : 'manual-backup'
  const snapshot = await createBackupSnapshot(label)
  return res.status(201).json(snapshot)
})

app.get('/api/admin/media/:id', authRequired, async (req, res) => {
  return res.json((await getMediaAsset(req.params.id)) ?? { id: req.params.id, message: 'Asset not found.' })
})

// ── Media upload ──────────────────────────────────────────────────────────────
app.post('/api/media/upload', authRequired, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' })
  const { originalname, mimetype, size, path: tempPath } = req.file

  const validation = validateMediaUpload({ originalName: originalname, mimeType: mimetype, size })
  if (!validation.valid) {
    try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
    return res.status(400).json({ error: validation.errors.join(' ') })
  }

  // Build a unique, sanitized file name
  const sanitized = originalname.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
  const ext = path.extname(sanitized) || '.jpg'
  const baseName = path.basename(sanitized, ext)
  const uniqueName = `${baseName}-${Date.now()}${ext}`

  let finalUrl: string

  try {
    // ── Upload to Supabase Storage (persistent, works on Vercel + Render + local) ──
    finalUrl = await uploadToStorage({ tempPath, fileName: uniqueName, mimeType: mimetype })
  } catch (storageErr) {
    console.error('[Media] Supabase Storage upload failed:', storageErr)
    // Fallback: save to local disk (dev only — not persistent in production)
    if (config.nodeEnv !== 'production') {
      const finalMediaDir = path.resolve(process.cwd(), 'data', 'media')
      fs.mkdirSync(finalMediaDir, { recursive: true })
      const finalPath = path.join(finalMediaDir, uniqueName)
      try { fs.renameSync(tempPath, finalPath) } catch { fs.copyFileSync(tempPath, finalPath); fs.unlinkSync(tempPath) }
      finalUrl = `/media/${uniqueName}`
      console.warn('[Media] Using local disk fallback — file will NOT persist in production.')
    } else {
      try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
      return res.status(500).json({ error: 'Media upload failed. Please try again.' })
    }
  } finally {
    // Always clean up the multer temp file
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath) } catch { /* ignore */ }
  }

  const record = createMediaAssetRecord({
    kind: mimetype.startsWith('image/') ? 'image' : 'file',
    fileName: uniqueName,
    url: finalUrl,
    size,
  })

  // Persist the asset record to Supabase DB
  await setMediaAsset({ ...record, metadata: {} }).catch(() => {})

  return res.status(201).json({ ok: true, url: finalUrl, id: record.id, fileName: uniqueName, mimeType: mimetype, size })
})

app.post('/api/media/validate', authRequired, async (req, res) => {
  const payload = z.object({ originalName: z.string().min(1), mimeType: z.string().min(1), size: z.number().min(1), width: z.number().optional(), height: z.number().optional() }).safeParse(req.body)
  if (!payload.success) return res.status(400).json({ error: payload.error.issues })
  return res.json(validateMediaUpload(payload.data))
})

app.post('/api/media/optimize', authRequired, async (req, res) => {
  const payload = z.object({ fileName: z.string().min(1), mimeType: z.string().min(1), size: z.number().min(1), width: z.number().optional(), height: z.number().optional() }).safeParse(req.body)
  if (!payload.success) return res.status(400).json({ error: payload.error.issues })
  return res.json(optimizeMediaPayload(payload.data))
})

app.post('/api/admin/media', authRequired, async (req, res) => {
  const payload = z.object({ id: z.string().min(1), kind: z.string().min(1), fileName: z.string().min(1), url: z.string().min(1), width: z.number().optional(), height: z.number().optional(), size: z.number().optional(), metadata: z.record(z.unknown()).optional() }).safeParse(req.body)
  if (!payload.success) return res.status(400).json({ error: payload.error.issues })
  const asset = await setMediaAsset(payload.data)
  await createAuditLog('media_asset_saved', { id: asset.id, kind: asset.kind }, withAdminUser(req)?.email, 'media_asset', asset.id)
  return res.status(201).json(asset)
})

app.post('/api/admin/media/records', authRequired, async (req, res) => {
  const payload = z.object({ kind: z.string().min(1), fileName: z.string().min(1), url: z.string().min(1), width: z.number().optional(), height: z.number().optional(), size: z.number().optional(), metadata: z.record(z.unknown()).optional() }).safeParse(req.body)
  if (!payload.success) return res.status(400).json({ error: payload.error.issues })
  const record = createMediaAssetRecord(payload.data)
  await createAuditLog('media_record_created', { id: record.id, kind: record.kind }, withAdminUser(req)?.email, 'media_asset', record.id)
  return res.status(201).json(record)
})

// ── SEO ───────────────────────────────────────────────────────────────────────
app.get('/api/admin/seo/:pageKey', authRequired, async (req, res) => {
  return res.json((await getPageSeoMeta(req.params.pageKey)) ?? { pageKey: req.params.pageKey, title: null, description: null })
})

app.put('/api/admin/seo/:pageKey', authRequired, async (req, res) => {
  const payload = await upsertPageSeoMeta(req.params.pageKey, req.body ?? {})
  await createAuditLog('seo_meta_updated', { pageKey: req.params.pageKey }, withAdminUser(req)?.email, 'seo_meta', req.params.pageKey)
  return res.json({ ok: true, payload })
})

// ── Site / public data ────────────────────────────────────────────────────────
app.get('/api/site', async (_req, res) => {
  const siteSettings = await getSiteSettings()
  res.json({
    site: (siteSettings as Record<string, unknown>)?.site ?? { name: 'ARIPAN', legalName: 'ARIPAN Mithila Studio', tagline: 'Mithila painting, held with museum care.', url: 'https://www.aripan.art', email: 'jhaaditi286@gmail.com', instagram: 'https://www.instagram.com/aripan_aditi', facebook: 'https://www.facebook.com/aditi.jha.965928/', tiktok: 'https://www.tiktok.com/@aripan_aditi' },
    artist: (siteSettings as Record<string, unknown>)?.artist ?? { name: 'ARIPAN' },
    testimonials: (siteSettings as Record<string, unknown>)?.testimonials ?? [],
    products: await readRows('products'),
    collections: await readRows('collections'),
    galleryWorks: await readRows('gallery_works'),
    articles: await readRows('articles'),
    legalPages: (await readRows<{ slug?: string }>('legal_pages')).reduce<Record<string, unknown>>((acc, page) => { acc[page.slug ?? 'unknown'] = page; return acc }, {}),
  })
})

app.get('/api/products', async (_req, res) => res.json(await readRows('products')))
app.get('/api/collections', async (_req, res) => res.json(await readRows('collections')))
app.get('/api/gallery', async (_req, res) => res.json(await readRows('gallery_works')))
app.get('/api/articles', async (_req, res) => res.json(await readRows('articles')))
app.get('/api/legal', async (_req, res) => res.json(await readRows('legal_pages')))

// ── Admin CRUD for catalogue ──────────────────────────────────────────────────
app.post('/api/admin/products', authRequired, async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const input = parsed.data
  await upsertRecord('products', input.id, input.slug, input)
  await createAuditLog('product_created', { id: input.id, slug: input.slug }, withAdminUser(req)?.email, 'product', input.id)
  return res.status(201).json({ ok: true, item: input })
})

app.put('/api/admin/products/:id', authRequired, async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const input = parsed.data
  await upsertRecord('products', input.id, input.slug, input)
  await createAuditLog('product_updated', { id: input.id, slug: input.slug }, withAdminUser(req)?.email, 'product', input.id)
  return res.json({ ok: true, item: input })
})

app.delete('/api/admin/products/:id', authRequired, async (req, res) => {
  await deleteRecord('products', req.params.id)
  await createAuditLog('product_deleted', { id: req.params.id }, withAdminUser(req)?.email, 'product', req.params.id)
  return res.json({ ok: true })
})

app.post('/api/admin/collections', authRequired, async (req, res) => {
  const parsed = collectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  await upsertRecord('collections', item.slug, item.slug, item)
  await createAuditLog('collection_created', { slug: item.slug }, withAdminUser(req)?.email, 'collection', item.slug)
  return res.status(201).json({ ok: true, item })
})

app.put('/api/admin/collections/:slug', authRequired, async (req, res) => {
  const parsed = collectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  await upsertRecord('collections', item.slug, item.slug, item)
  await createAuditLog('collection_updated', { slug: item.slug }, withAdminUser(req)?.email, 'collection', item.slug)
  return res.json({ ok: true, item })
})

app.delete('/api/admin/collections/:slug', authRequired, async (req, res) => {
  await deleteRecord('collections', req.params.slug)
  await createAuditLog('collection_deleted', { slug: req.params.slug }, withAdminUser(req)?.email, 'collection', req.params.slug)
  return res.json({ ok: true })
})

app.post('/api/admin/gallery', authRequired, async (req, res) => {
  const parsed = gallerySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  await upsertRecord('gallery_works', item.id, item.slug, item)
  await createAuditLog('gallery_work_created', { id: item.id, slug: item.slug }, withAdminUser(req)?.email, 'gallery_work', item.id)
  return res.status(201).json({ ok: true, item })
})

app.put('/api/admin/gallery/:id', authRequired, async (req, res) => {
  const parsed = gallerySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  await upsertRecord('gallery_works', item.id, item.slug, item)
  await createAuditLog('gallery_work_updated', { id: item.id, slug: item.slug }, withAdminUser(req)?.email, 'gallery_work', item.id)
  return res.json({ ok: true, item })
})

app.delete('/api/admin/gallery/:id', authRequired, async (req, res) => {
  await deleteRecord('gallery_works', req.params.id)
  await createAuditLog('gallery_work_deleted', { id: req.params.id }, withAdminUser(req)?.email, 'gallery_work', req.params.id)
  return res.json({ ok: true })
})

app.post('/api/admin/articles', authRequired, async (req, res) => {
  const parsed = articleSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  await upsertRecord('articles', item.slug, item.slug, item)
  await createAuditLog('article_created', { slug: item.slug }, withAdminUser(req)?.email, 'article', item.slug)
  return res.status(201).json({ ok: true, item })
})

app.put('/api/admin/articles/:slug', authRequired, async (req, res) => {
  const parsed = articleSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  await upsertRecord('articles', item.slug, item.slug, item)
  await createAuditLog('article_updated', { slug: item.slug }, withAdminUser(req)?.email, 'article', item.slug)
  return res.json({ ok: true, item })
})

app.delete('/api/admin/articles/:slug', authRequired, async (req, res) => {
  await deleteRecord('articles', req.params.slug)
  await createAuditLog('article_deleted', { slug: req.params.slug }, withAdminUser(req)?.email, 'article', req.params.slug)
  return res.json({ ok: true })
})

app.put('/api/admin/legal/:slug', authRequired, async (req, res) => {
  const parsed = legalSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = { ...parsed.data, slug: req.params.slug }
  await upsertRecord('legal_pages', req.params.slug, req.params.slug, item)
  await createAuditLog('legal_page_updated', { slug: req.params.slug }, withAdminUser(req)?.email, 'legal_page', req.params.slug)
  return res.json({ ok: true, item })
})

// ── Commission enquiries ──────────────────────────────────────────────────────
const commissionSchema = z.object({ name: z.string().min(1), email: z.string().email(), country: z.string().min(1), budget: z.string().min(1), description: z.string().min(1) })

app.post('/api/commissions', async (req, res) => {
  const parsed = commissionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const enquiry = await createCommissionEnquiry(parsed.data)
  await createAuditLog('commission_enquiry_submitted', { email: parsed.data.email }, parsed.data.email, 'commission_enquiry', String(enquiry?.id ?? ''))
  return res.status(201).json({ ok: true, id: enquiry?.id })
})

// ── Newsletter subscriptions ──────────────────────────────────────────────────
app.post('/api/newsletter/subscribe', async (req, res) => {
  const parsed = z.object({
    email: z.string().email(),
    consent: z.boolean(),
  }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'A valid email and consent are required.' })
  if (!parsed.data.consent) return res.status(400).json({ error: 'Consent is required to subscribe.' })
  try {
    await createNotification({
      type: 'newsletter_signup',
      title: 'New Studio Letter Subscriber',
      message: `${parsed.data.email} subscribed to studio letters.`,
      recipientType: 'admin',
      channel: 'in-app',
      status: 'delivered',
    })
    await createAuditLog('newsletter_subscribe', { email: parsed.data.email }, parsed.data.email, 'newsletter', parsed.data.email)
    return res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[Newsletter] Failed to save subscriber:', err)
    return res.status(500).json({ error: 'Could not save subscription.' })
  }
})

app.get('/api/admin/commissions', authRequired, async (_req, res) => {
  return res.json(await getAllCommissionEnquiries())
})

app.patch('/api/admin/commissions/:id', authRequired, async (req, res) => {
  const parsed = z.object({ status: z.string().min(1), notes: z.string().optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const updated = await updateCommissionEnquiryStatus(req.params.id, parsed.data.status, parsed.data.notes)
  await createAuditLog('commission_status_updated', { id: req.params.id, status: parsed.data.status }, withAdminUser(req)?.email, 'commission_enquiry', req.params.id)
  return res.json(updated)
})

// ── Events ────────────────────────────────────────────────────────────────────
const eventSchema = z.object({ id: z.string().optional(), title: z.string().min(1), slug: z.string().min(1), date: z.string().min(1), time: z.string().optional(), description: z.string().min(1), image: z.string().optional(), entryFee: z.string().optional(), location: z.string().optional(), status: z.enum(['upcoming', 'ongoing', 'past', 'cancelled']).default('upcoming') })

app.get('/api/events', async (_req, res) => {
  return res.json(await getAllEvents())
})

app.post('/api/admin/events', authRequired, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const ev = await upsertEvent({ ...parsed.data, id: undefined })
  await createAuditLog('event_created', { title: parsed.data.title }, withAdminUser(req)?.email, 'event', String(ev?.id ?? ''))
  return res.status(201).json({ ok: true, item: ev })
})

app.put('/api/admin/events/:id', authRequired, async (req, res) => {
  const parsed = eventSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const ev = await upsertEvent({ ...parsed.data, id: req.params.id })
  await createAuditLog('event_updated', { id: req.params.id, title: parsed.data.title }, withAdminUser(req)?.email, 'event', req.params.id)
  return res.json({ ok: true, item: ev })
})

app.delete('/api/admin/events/:id', authRequired, async (req, res) => {
  await deleteEvent(req.params.id)
  await createAuditLog('event_deleted', { id: req.params.id }, withAdminUser(req)?.email, 'event', req.params.id)
  return res.json({ ok: true })
})

// ── Admin overview ────────────────────────────────────────────────────────────
app.get('/api/admin/overview', authRequired, async (_req, res) => {
  const [products, collections, galleryWorks, articles, legalPages] = await Promise.all([
    readRows('products'), readRows('collections'), readRows('gallery_works'), readRows('articles'), readRows('legal_pages'),
  ])
  return res.json({ products: products.length, collections: collections.length, galleryWorks: galleryWorks.length, articles: articles.length, legalPages: legalPages.length })
})

app.get('/api/admin/orders', authRequired, async (_req, res) => {
  return res.json(await getAllOrdersForAdmin())
})

app.patch('/api/admin/orders/:id/status', authRequired, async (req, res) => {
  const parsed = z.object({ status: z.enum(['pending', 'confirmed', 'processing', 'completed', 'paid', 'cancelled']).default('confirmed') }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const updated = await updateOrderStatus(req.params.id, parsed.data.status)
  await createAuditLog('order_status_updated', { orderId: req.params.id, status: parsed.data.status }, withAdminUser(req)?.email, 'order', req.params.id)
  return res.json(updated)
})

// ── Admin privacy requests ────────────────────────────────────────────────────
app.get('/api/admin/privacy/requests', authRequired, async (_req, res) => {
  return res.json(await getAllCustomerDataRequests())
})

app.post('/api/admin/privacy/requests/:id/resolve', authRequired, async (req, res) => {
  const parsed = z.object({ status: z.enum(['completed', 'rejected']).default('completed'), metadata: z.record(z.unknown()).optional() }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const updated = await resolveCustomerDataRequest(req.params.id, parsed.data.status, parsed.data.metadata ?? {})
  await createAuditLog('privacy_request_resolved', { requestId: req.params.id, status: parsed.data.status }, withAdminUser(req)?.email, 'customer_data_request', req.params.id)
  return res.json(updated)
})

// ── Public content blocks ─────────────────────────────────────────────────────
app.get('/api/content/blocks/:key', async (req, res) => {
  const block = await getSiteContentBlock(req.params.key)
  return res.json(block ?? { key: req.params.key, data: {} })
})

// ── Provider health ───────────────────────────────────────────────────────────
app.get('/api/admin/providers', authRequired, (_req, res) => {
  return res.json(getProviderHealthSnapshot())
})

// ── Admin panel static files (all environments incl. Vercel) ────────────────
if (adminRoot) app.use('/aripan-admin-secure', express.static(adminRoot))

// ── Other static assets (local dev only) ─────────────────────────────────────
if (!process.env.VERCEL) {
  const localMediaDir = path.resolve(process.cwd(), 'data', 'media')
  fs.mkdirSync(localMediaDir, { recursive: true })
  app.use('/media', express.static(localMediaDir))

  if (distIndex && fs.existsSync(distIndex)) {
    app.use(express.static(distRoot))
    app.get('{*path}', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/aripan-admin-secure')) return next()
      res.sendFile(distIndex)
    })
  } else if (publicRoot) {
    app.use(express.static(publicRoot))
  }
}

// ── Bootstrap (async) ─────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await ensureSchema()
    await ensureAdminUser()
    // Ensure the Supabase Storage bucket for media uploads exists
    await ensureStorageBucket().catch((err) =>
      console.warn('[Storage] Could not ensure media bucket (non-fatal):', err)
    )
    const seeded = await hasSeedData()
    if (!seeded) await seedDatabase()
    console.log('[ARIPAN] Database initialised via Supabase.')
  } catch (err) {
    console.error('[ARIPAN] Bootstrap error:', err)
  }
}

// ── Vercel export + local dev listen ─────────────────────────────────────────
// Call bootstrap then start listening (skipped on Vercel — handled per-request)
if (!process.env.VERCEL) {
  bootstrap().then(() => {
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`ARIPAN API listening on http://0.0.0.0:${config.port} (env: ${config.nodeEnv})`)
    })
  })
} else {
  // On Vercel, bootstrap once per cold-start without blocking the export
  bootstrap().catch(console.error)
}

// Default export for Vercel (serverless handler)
export default app