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
import { createRestorePlan, generateDeploymentChecklist, getRecoveryStatus, verifyRecoveryPlan } from './deploy-readiness.js'
import { createMediaAssetRecord, optimizeMediaPayload, validateMediaUpload } from './media-pipeline.js'
import { buildGoogleOAuthUrl, decodeJwtPayload, exchangeGoogleCode, getGoogleUserInfo, getProviderHealthSnapshot } from './providers.js'
import { getSupabaseSyncStatus, queueSupabaseSync, runSupabaseSync } from './supabase-sync.js'
import { createAuditLog, createCustomerDataExport, createCustomerDataRequest, createPaymentAttempt, db, deleteRecord, ensureAdminUser, ensureSchema, getAdminUserByEmail, getAllOrdersForAdmin, getCustomerById, getCustomerUserByEmail, getSiteSettings, hasSeedData, readRows, registerCustomerAccount, resolveCustomerDataRequest, seedDatabase, updateOrderStatus, upsertRecord } from './db.js'

const upload = multer({ dest: 'data/media/' })
const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.resolve(__dirname, '../public')
const adminRoot = path.resolve(__dirname, '../public/admin')

const productSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  collections: z.array(z.string()).default([]),
  images: z.array(z.string()),
  createdAt: z.string(),
  price: z.number(),
  currency: z.string().default('NRS'),
  availability: z.string(),
  medium: z.string(),
  dimensions: z.string(),
  year: z.number(),
  description: z.string(),
  story: z.string(),
  details: z.array(z.string()),
  shipping: z.string(),
  returns: z.string(),
  sku: z.string(),
  featured: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  motifs: z.array(z.string()),
})

const collectionSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  short: z.string(),
  description: z.string(),
  image: z.string(),
  hero: z.string(),
})

const gallerySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  year: z.number(),
  image: z.string(),
  medium: z.string(),
  size: z.string(),
  motifs: z.array(z.string()),
  story: z.string(),
  productSlug: z.string().optional(),
})

const articleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string(),
  date: z.string(),
  readMinutes: z.number(),
  image: z.string(),
  tags: z.array(z.string()),
  body: z.array(z.string()),
})

const legalSchema = z.object({
  title: z.string(),
  updated: z.string(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })),
})

const adminLoginSchema = z.object({ email: z.string().email(), password: z.string().min(6) })
const buyerDetailsSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(1).optional(),
  age: z.union([z.number(), z.string()]).optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  deliveryDate: z.string().min(1).optional(),
  deliveryTime: z.string().min(1).optional(),
  notes: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  location_accuracy: z.number().optional(),
  location_url: z.string().url().optional(),
}).passthrough()
const customerAccountSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  marketingConsent: z.boolean().optional().default(false),
})
const customerLoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })
const customerAddressSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().min(1),
})

app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: config.allowedOrigins, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use('/api', rateLimit({ windowMs: 60_000, max: 180 }))

function signToken(email: string, role: 'super_admin' | 'customer') {
  return jwt.sign({ email, role }, config.jwtSecret, { expiresIn: '12h' })
}

function authRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { email: string; role: 'super_admin' | 'customer' }
    req.user = { email: decoded.email, role: decoded.role }
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

function customerAuthRequired(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { email: string; role: 'super_admin' | 'customer' }
    if (decoded.role !== 'customer') {
      return res.status(403).json({ error: 'Customer account required.' })
    }
    req.user = { email: decoded.email, role: decoded.role }
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

function withAdminUser<T extends express.Request>(req: T) {
  return req.user as { email: string; role?: string } | undefined
}

app.get('/api/health', (_req, res) => {
  const databaseStatus = db.prepare('SELECT 1').get() ? 'ok' : 'unavailable'
  const siteSettings = getSiteSettings()
  const providerHealth = getProviderHealthSnapshot()
  const syncStatus = getSupabaseSyncStatus()

  res.json({
    status: 'ok',
    service: 'aripan-api',
    database: databaseStatus,
    timestamp: new Date().toISOString(),
    supabaseConfigured: providerHealth.supabaseConfigured,
    googleConfigured: providerHealth.googleConfigured,
    sync: syncStatus,
    site: siteSettings ? 'configured' : 'pending',
  })
})

app.get('/api/supabase/sync-status', (_req, res) => {
  res.json(getSupabaseSyncStatus())
})

app.post('/api/supabase/sync', async (req, res) => {
  const entity = typeof req.body?.entity === 'string' ? req.body.entity : 'customers'
  const operation = typeof req.body?.operation === 'string' ? req.body.operation : 'sync'
  const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {}
  const result = await runSupabaseSync(entity, operation, payload)
  return res.json(result)
})

app.get('/api/auth/google', (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : 'aripan-google-auth'
  const redirectUri = typeof req.query.redirectUri === 'string' ? req.query.redirectUri : undefined
  const url = buildGoogleOAuthUrl(state, redirectUri)
  return res.json({ url, configured: Boolean(process.env.GOOGLE_CLIENT_ID) })
})

app.post('/api/auth/google/callback', async (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code : ''
  const redirectUri = typeof req.body?.redirectUri === 'string' ? req.body.redirectUri : process.env.GOOGLE_REDIRECT_URI

  if (!code) {
    return res.status(400).json({ error: 'Google authorization code is required.' })
  }

  const exchange = await exchangeGoogleCode(code, redirectUri)
  if (!exchange.configured) {
    return res.status(501).json({ error: exchange.error })
  }

  if ('error' in exchange && exchange.error) {
    return res.status(400).json({ error: exchange.error })
  }

  const tokenPayload = exchange.tokens?.id_token ? decodeJwtPayload(exchange.tokens.id_token) : null
  const userInfo = exchange.tokens?.access_token ? await getGoogleUserInfo(exchange.tokens.access_token) : null
  const email = (tokenPayload?.email ?? userInfo?.email ?? '').toLowerCase()

  if (!email) {
    return res.status(400).json({ error: 'Google account email could not be determined.' })
  }

  let customer = getCustomerUserByEmail(email)
  if (!customer) {
    customer = registerCustomerAccount({
      firstName: tokenPayload?.given_name ?? userInfo?.given_name ?? email.split('@')[0] ?? 'Customer',
      lastName: tokenPayload?.family_name ?? userInfo?.family_name ?? 'Google',
      email,
      password: `google-oauth-${Math.random().toString(36).slice(2)}-${Date.now()}`,
      marketingConsent: false,
    }) ?? undefined
  }

  if (!customer) {
    return res.status(500).json({ error: 'Customer account could not be created from Google sign-in.' })
  }

  createAuditLog('google_oauth_login', { email }, customer.email, 'customer', customer.id)
  return res.json({
    token: signToken(customer.email, 'customer'),
    user: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      marketingConsent: customer.marketingConsent,
      role: 'customer',
    },
  })
})

app.post('/api/admin/login', async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid login payload.' })
  }

  const user = getAdminUserByEmail(parsed.data.email)
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' })
  }

  const valid = await bcrypt.compare(parsed.data.password, user.password_hash)
  if (!valid) {
    createAuditLog('admin_login_failed', { email: parsed.data.email }, parsed.data.email, 'admin_user', user.id)
    return res.status(401).json({ error: 'Invalid credentials.' })
  }

  createAuditLog('admin_login_success', { email: parsed.data.email }, parsed.data.email, 'admin_user', user.id)
  return res.json({ token: signToken(user.email, 'super_admin'), user: { email: user.email, role: user.role } })
})

app.post('/api/customers/register', async (req, res) => {
  const parsed = customerAccountSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const user = await import('./db.js').then(({ registerCustomerAccount, getCustomerUserByEmail }) => {
    const created = registerCustomerAccount({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      password: parsed.data.password,
      marketingConsent: parsed.data.marketingConsent,
    })

    return created ?? getCustomerUserByEmail(parsed.data.email)
  })

  if (!user) {
    return res.status(409).json({ error: 'An account with this email already exists.' })
  }

  createAuditLog('customer_registered', { email: user.email }, user.email, 'customer', user.id)
  return res.status(201).json({
    token: signToken(user.email, 'customer'),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      marketingConsent: user.marketingConsent,
      role: 'customer',
    },
  })
})

app.post('/api/customers/login', async (req, res) => {
  const parsed = customerLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const user = (await import('./db.js')).getCustomerUserByEmail(parsed.data.email)
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' })
  }

  const valid = await bcrypt.compare(parsed.data.password, user.password_hash)
  if (!valid) {
    createAuditLog('customer_login_failed', { email: parsed.data.email }, parsed.data.email, 'customer', user.id)
    return res.status(401).json({ error: 'Invalid credentials.' })
  }

  ;(await import('./db.js')).updateCustomerLastLogin(user.id)
  createAuditLog('customer_login_success', { email: user.email }, user.email, 'customer', user.id)
  return res.json({
    token: signToken(user.email, 'customer'),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      marketingConsent: user.marketingConsent,
      role: 'customer',
    },
  })
})

app.get('/api/customers/me', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) {
    return res.status(404).json({ error: 'Customer not found.' })
  }

  return res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    marketingConsent: user.marketingConsent,
    role: 'customer',
    addresses: (await import('./db.js')).getCustomerAddresses(user.id),
    cart: (await import('./db.js')).getCustomerCart(user.id),
    wishlist: (await import('./db.js')).getCustomerWishlist(user.id),
  })
})

app.put('/api/customers/me', customerAuthRequired, async (req, res) => {
  const current = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!current) {
    return res.status(404).json({ error: 'Customer not found.' })
  }

  const next = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    marketingConsent: z.boolean().optional(),
  }).safeParse(req.body)

  if (!next.success) {
    return res.status(400).json({ error: next.error.issues })
  }

  const updated = (await import('./db.js')).db.prepare(`UPDATE customers SET first_name = COALESCE(@firstName, first_name), last_name = COALESCE(@lastName, last_name), marketing_consent = COALESCE(@marketingConsent, marketing_consent), updated_at = datetime('now') WHERE id = @id`).run({
    id: current.id,
    firstName: next.data.firstName ?? null,
    lastName: next.data.lastName ?? null,
    marketingConsent: next.data.marketingConsent === undefined ? null : Number(next.data.marketingConsent),
  })

  const result = (await import('./db.js')).getCustomerById(current.id)
  return res.json({
    id: result?.id,
    email: result?.email,
    firstName: result?.firstName,
    lastName: result?.lastName,
    marketingConsent: result?.marketingConsent,
    role: 'customer',
  })
})

app.get('/api/customers/addresses', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json((await import('./db.js')).getCustomerAddresses(user.id))
})

app.post('/api/customers/addresses', customerAuthRequired, async (req, res) => {
  const parsed = customerAddressSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })

  const item = (await import('./db.js')).upsertCustomerAddress(user.id, parsed.data)
  createAuditLog('customer_address_updated', { customerId: user.id, label: item.label }, user.email, 'customer_address', String(item.id))
  return res.status(201).json(item)
})

app.get('/api/customers/cart', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json((await import('./db.js')).getCustomerCart(user.id))
})

app.put('/api/customers/cart', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })

  const items = Array.isArray(req.body) ? req.body : []
  const value = (await import('./db.js')).setCustomerCart(user.id, items)
  createAuditLog('customer_cart_updated', { customerId: user.id, count: items.length }, user.email, 'customer_cart', user.id)
  return res.json(value)
})

app.get('/api/customers/wishlist', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json((await import('./db.js')).getCustomerWishlist(user.id))
})

app.put('/api/customers/wishlist', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })

  const items = Array.isArray(req.body) ? req.body.map((value) => String(value)) : []
  const value = (await import('./db.js')).setCustomerWishlist(user.id, items)
  createAuditLog('customer_wishlist_updated', { customerId: user.id, count: items.length }, user.email, 'customer_wishlist', user.id)
  return res.json(value)
})

const orderItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().optional(),
  name: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().default(1),
  image: z.string().optional(),
  currency: z.string().optional(),
})

function sendOrderNotification(
  order: {
    id: string
    customerId?: string
    total?: number
    items?: Array<{ id: string; name?: string; slug?: string; price?: number; quantity?: number; image?: string; currency?: string }>
    metadata?: Record<string, unknown>
    locationUrl?: string | null
    latitude?: number | null
    longitude?: number | null
    locationAccuracy?: number | null
    status?: string
  },
  customerEmail: string,
  action: 'created' | 'updated' | 'cancelled' = 'created',
) {
  const { emailJsPublicKey, emailJsServiceId, emailJsTemplateId, adminEmail } = config
  if (!emailJsPublicKey || !emailJsServiceId || !emailJsTemplateId) {
    console.warn('[EmailJS] Notice: EmailJS credentials (EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID) are not configured in .env. The order has been saved successfully to the database and admin panel.')
    return
  }

  const metadata = order.metadata ?? {}
  const items = Array.isArray(order.items) ? order.items : []
  const itemsSummary = items.length > 0
    ? items.map((i, idx) => `${idx + 1}. ${i.name || i.slug || i.id} (Qty: ${i.quantity || 1}, Price: NRS ${Number(i.price || 0).toLocaleString()})`).join('\n')
    : 'No items detailed'

  const firstItem = items[0] || {}

  const locUrl = order.locationUrl ?? (metadata.location_url as string | undefined) ?? (order.latitude && order.longitude ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : (metadata.latitude && metadata.longitude ? `https://www.google.com/maps?q=${metadata.latitude},${metadata.longitude}` : ''))

  const actionText = action === 'cancelled'
    ? 'ORDER CANCELLED BY CUSTOMER'
    : (action === 'updated' ? 'ORDER DETAILS UPDATED BY CUSTOMER' : 'NEW ORDER ENQUIRY')

  const templateParams = {
    to_email: adminEmail || customerEmail,
    admin_email: adminEmail || 'admin@aripan.art',
    order_action: actionText,
    action: actionText,
    order_status: order.status || (action === 'cancelled' ? 'cancelled' : 'pending'),
    customer_email: customerEmail,
    customer_name: (metadata.name as string | undefined) ?? customerEmail,
    customer_age: (metadata.age as string | number | undefined) ?? '',
    phone: (metadata.phone as string | undefined) ?? '',
    delivery_date: (metadata.deliveryDate as string | undefined) ?? '',
    delivery_time: (metadata.deliveryTime as string | undefined) ?? '',
    address: (metadata.address as string | undefined) ?? (metadata.location as string | undefined) ?? '',
    location: (metadata.address as string | undefined) ?? (metadata.location as string | undefined) ?? '',
    notes: (metadata.notes as string | undefined) ?? '',
    order_id: order.id,
    order_total: Number(order.total ?? 0),
    order_total_formatted: `NRS ${Number(order.total ?? 0).toLocaleString()}`,
    currency: 'NRS',
    items_summary: itemsSummary,
    items: JSON.stringify(items),
    product_name: firstItem.name || firstItem.slug || '',
    product_price: firstItem.price != null ? `NRS ${Number(firstItem.price).toLocaleString()}` : '',
    product_image: firstItem.image || '',
    location_url: locUrl,
    latitude: order.latitude ?? (metadata.latitude as number | undefined) ?? '',
    longitude: order.longitude ?? (metadata.longitude as number | undefined) ?? '',
    location_accuracy: order.locationAccuracy ?? (metadata.location_accuracy as number | undefined) ?? '',
  }

  const payload = {
    service_id: emailJsServiceId,
    template_id: emailJsTemplateId,
    user_id: emailJsPublicKey,
    template_params: templateParams,
  }

  console.log(`[EmailJS] Dispatching ${action} notification for order ${order.id} to ${adminEmail || customerEmail}...`)

  fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (res.ok) {
        console.log(`[EmailJS] Email notification (${action}) sent successfully for order ${order.id}`)
      } else {
        const text = await res.text().catch(() => '')
        console.error(`[EmailJS] Email notification failed: HTTP ${res.status} - ${text}`)
      }
    })
    .catch((err) => {
      console.error('[EmailJS] Network error sending email notification:', err)
    })
}

app.post('/api/orders/checkout', customerAuthRequired, async (req, res) => {
  try {
    const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
    if (!user) return res.status(404).json({ error: 'Customer not found.' })

    const payload = z.object({
      shippingAddressId: z.string().optional(),
      paymentProvider: z.string().default('manual'),
      paymentStatus: z.enum(['pending', 'paid', 'failed']).default('pending'),
      note: z.string().optional(),
      buyer: buyerDetailsSchema.optional(),
      items: z.array(orderItemSchema).optional(),
    }).safeParse(req.body)

    if (!payload.success) {
      return res.status(400).json({ error: payload.error.issues })
    }

    const order = (await import('./db.js')).createOrderFromCart(user.id, payload.data)
    createAuditLog('order_created', { orderId: order.id, customerId: user.id, buyer: order.metadata }, user.email, 'order', order.id)
    sendOrderNotification(order, user.email, 'created')
    return res.status(201).json(order)
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Order could not be created.' })
  }
})

app.get('/api/orders/me', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json((await import('./db.js')).getOrdersForCustomer(user.id))
})

app.patch('/api/orders/:id', customerAuthRequired, async (req, res) => {
  try {
    const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
    if (!user) return res.status(404).json({ error: 'Customer not found.' })

    const parsed = z.object({
      deliveryDate: z.string().optional(),
      deliveryTime: z.string().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
      phone: z.string().optional(),
      name: z.string().optional(),
      status: z.enum(['pending', 'cancelled']).optional(),
    }).safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues })
    }

    const { updateCustomerOrder } = await import('./db.js')
    const updated = updateCustomerOrder(req.params.id, user.id, parsed.data)
    createAuditLog('customer_order_updated', { orderId: req.params.id, updates: parsed.data }, user.email, 'order', req.params.id)
    sendOrderNotification(updated, user.email, parsed.data.status === 'cancelled' ? 'cancelled' : 'updated')
    return res.json(updated)
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not update order.' })
  }
})

app.post('/api/orders/:id/cancel', customerAuthRequired, async (req, res) => {
  try {
    const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
    if (!user) return res.status(404).json({ error: 'Customer not found.' })

    const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'Cancelled by customer'
    const { cancelCustomerOrder } = await import('./db.js')
    const updated = cancelCustomerOrder(req.params.id, user.id, reason)
    createAuditLog('customer_order_cancelled', { orderId: req.params.id, reason }, user.email, 'order', req.params.id)
    sendOrderNotification(updated, user.email, 'cancelled')
    return res.json(updated)
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Could not cancel order.' })
  }
})

app.get('/api/customers/data/export', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })
  return res.json(createCustomerDataExport(user.id))
})

app.post('/api/customers/data-request', customerAuthRequired, async (req, res) => {
  const user = (await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)
  if (!user) return res.status(404).json({ error: 'Customer not found.' })

  const parsed = z.object({
    requestType: z.enum(['export', 'delete']),
    reason: z.string().optional(),
  }).safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const request = createCustomerDataRequest(user.id, parsed.data.requestType, parsed.data.reason)
  createAuditLog('customer_data_request_submitted', { customerId: user.id, requestId: request.id }, user.email, 'customer_data_request', request.id)
  return res.status(201).json(request)
})

app.get('/api/admin/privacy/requests', authRequired, async (_req, res) => {
  const rows = db.prepare('SELECT * FROM customer_data_requests ORDER BY created_at DESC').all() as Array<Record<string, unknown>>
  return res.json(rows.map((row) => ({
    id: row.id,
    customerId: row.customer_id,
    requestType: row.request_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : {},
  })))
})

app.post('/api/admin/privacy/requests/:id/resolve', authRequired, async (req, res) => {
  const parsed = z.object({
    status: z.enum(['completed', 'rejected', 'pending']).default('completed'),
    metadata: z.record(z.unknown()).optional(),
  }).safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const request = resolveCustomerDataRequest(req.params.id, parsed.data.status, parsed.data.metadata ?? {})
  createAuditLog('customer_data_request_resolved', { requestId: request.id, status: request.status }, withAdminUser(req)?.email, 'customer_data_request', request.id)
  return res.json(request)
})

app.post('/api/orders/:orderId/payments/attempts', customerAuthRequired, async (req, res) => {
  const user = getCustomerById((await import('./db.js')).getCustomerUserByEmail((req.user as { email: string }).email)?.id ?? '')
  if (!user) return res.status(404).json({ error: 'Customer not found.' })

  const parsed = z.object({
    provider: z.string().default('manual'),
    amount: z.number().min(0),
    currency: z.string().default('NRS'),
    status: z.enum(['pending', 'paid', 'failed', 'refunded']).default('pending'),
    gateway: z.string().optional(),
    reference: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const attempt = createPaymentAttempt({
    orderId: req.params.orderId,
    customerId: user.id,
    provider: parsed.data.provider,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    status: parsed.data.status,
    gateway: parsed.data.gateway,
    reference: parsed.data.reference,
    metadata: parsed.data.metadata ?? {},
  })

  return res.status(201).json(attempt)
})

app.patch('/api/payments/attempts/:id', authRequired, async (req, res) => {
  const parsed = z.object({
    status: z.enum(['pending', 'paid', 'failed', 'refunded']),
    metadata: z.record(z.unknown()).optional(),
  }).safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }

  const attempt = (await import('./db.js')).updatePaymentAttemptStatus(req.params.id, parsed.data.status, parsed.data.metadata ?? {})
  createAuditLog('payment_attempt_status_updated', { paymentId: req.params.id, status: parsed.data.status }, withAdminUser(req)?.email, 'payment_attempt', req.params.id)
  return res.json(attempt)
})

app.get('/api/admin/roles', authRequired, async (_req, res) => {
  const { ensureDefaultAdminRoles, getAdminRolePermissions } = await import('./db.js')
  const defaultRoles = ensureDefaultAdminRoles()
  res.json(Object.fromEntries(Object.entries(defaultRoles).map(([roleName, permissions]) => [roleName, { ...permissions, canManageUsers: Boolean((permissions as Record<string, unknown>).canManageUsers) } ])))
})

app.get('/api/admin/content/blocks/:key', authRequired, async (_req, res) => {
  const { getSiteContentBlock } = await import('./db.js')
  const raw = getSiteContentBlock(_req.params.key)
  return res.json({ key: _req.params.key, data: raw ?? {} })
})

app.put('/api/admin/content/blocks/:key', authRequired, async (req, res) => {
  const { upsertSiteContentBlock } = await import('./db.js')
  const payload = req.body ?? {}
  upsertSiteContentBlock(req.params.key, payload)
  createAuditLog('content_block_updated', { key: req.params.key }, withAdminUser(req)?.email, 'content_block', req.params.key)
  return res.json({ ok: true, key: req.params.key, data: payload })
})

app.get('/api/admin/notifications', authRequired, async (_req, res) => {
  const { getNotifications } = await import('./db.js')
  return res.json(getNotifications())
})

app.get('/api/admin/health', authRequired, async (_req, res) => {
  const { getSystemHealthSnapshot, runStartupValidation } = await import('./db.js')
  const health = getSystemHealthSnapshot()
  const startup = runStartupValidation()
  return res.json({ startup, health, recovery: getRecoveryStatus(), deploymentChecklist: generateDeploymentChecklist({ frontendHost: 'render', backendHost: 'railway', environment: config.nodeEnv }) })
})

app.get('/api/admin/recovery/plan', authRequired, async (_req, res) => {
  const environment = config.nodeEnv === 'production' ? 'production' : 'staging'
  const plan = createRestorePlan(environment)
  return res.json({ plan, verification: verifyRecoveryPlan(plan), recovery: getRecoveryStatus() })
})

app.get('/api/admin/analytics/summary', authRequired, async (_req, res) => {
  const { getAnalyticsSummary } = await import('./db.js')
  return res.json(getAnalyticsSummary())
})

app.post('/api/admin/backups/create', authRequired, async (req, res) => {
  const { createBackupSnapshot } = await import('./db.js')
  const label = typeof req.body?.label === 'string' ? req.body.label : 'manual-backup'
  const snapshot = createBackupSnapshot(label)
  return res.status(201).json(snapshot)
})

app.get('/api/admin/media/:id', authRequired, async (req, res) => {
  const { getMediaAsset } = await import('./db.js')
  return res.json(getMediaAsset(req.params.id) ?? { id: req.params.id, message: 'Asset not found.' })
})


app.post('/api/media/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const { originalname, mimetype, size, path: tempPath } = req.file;

  // Validate
  const validation = validateMediaUpload({ originalName: originalname, mimeType: mimetype, size });
  if (!validation.valid) {
    try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
    return res.status(400).json({ error: validation.errors.join(' ') });
  }

  // Sanitize filename and move to final location
  const sanitized = originalname.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const ext = path.extname(sanitized) || '.jpg';
  const baseName = path.basename(sanitized, ext);
  const uniqueName = `${baseName}-${Date.now()}${ext}`;
  const mediaDir = path.resolve(process.cwd(), 'data', 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  const finalPath = path.join(mediaDir, uniqueName);
  try {
    fs.renameSync(tempPath, finalPath);
  } catch {
    fs.copyFileSync(tempPath, finalPath);
    try { fs.unlinkSync(tempPath) } catch { /* ignore */ }
  }

  return res.status(201).json({
    url: `/media/${uniqueName}`,
    fileName: uniqueName,
    size,
  });
});

app.post('/api/media/validate', authRequired, async (req, res) => {
  const payload = z.object({
    originalName: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().min(1),
    width: z.number().optional(),
    height: z.number().optional(),
  }).safeParse(req.body)

  if (!payload.success) {
    return res.status(400).json({ error: payload.error.issues })
  }

  return res.json(validateMediaUpload(payload.data))
})

app.post('/api/media/optimize', authRequired, async (req, res) => {
  const payload = z.object({
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    size: z.number().min(1),
    width: z.number().optional(),
    height: z.number().optional(),
  }).safeParse(req.body)

  if (!payload.success) {
    return res.status(400).json({ error: payload.error.issues })
  }

  return res.json(optimizeMediaPayload(payload.data))
})

app.post('/api/admin/media', authRequired, async (req, res) => {
  const { setMediaAsset } = await import('./db.js')
  const payload = z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    fileName: z.string().min(1),
    url: z.string().min(1),
    width: z.number().optional(),
    height: z.number().optional(),
    size: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).safeParse(req.body)

  if (!payload.success) {
    return res.status(400).json({ error: payload.error.issues })
  }

  const asset = setMediaAsset(payload.data)
  createAuditLog('media_asset_saved', { id: asset.id, kind: asset.kind }, withAdminUser(req)?.email, 'media_asset', asset.id)
  return res.status(201).json(asset)
})

app.post('/api/admin/media/records', authRequired, async (req, res) => {
  const payload = z.object({
    kind: z.string().min(1),
    fileName: z.string().min(1),
    url: z.string().min(1),
    width: z.number().optional(),
    height: z.number().optional(),
    size: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).safeParse(req.body)

  if (!payload.success) {
    return res.status(400).json({ error: payload.error.issues })
  }

  const record = createMediaAssetRecord(payload.data)
  createAuditLog('media_record_created', { id: record.id, kind: record.kind }, withAdminUser(req)?.email, 'media_asset', record.id)
  return res.status(201).json(record)
})

app.get('/api/admin/seo/:pageKey', authRequired, async (req, res) => {
  const { getPageSeoMeta } = await import('./db.js')
  return res.json(getPageSeoMeta(req.params.pageKey) ?? { pageKey: req.params.pageKey, title: null, description: null })
})

app.put('/api/admin/seo/:pageKey', authRequired, async (req, res) => {
  const { upsertPageSeoMeta } = await import('./db.js')
  const payload = upsertPageSeoMeta(req.params.pageKey, req.body ?? {})
  createAuditLog('seo_meta_updated', { pageKey: req.params.pageKey }, withAdminUser(req)?.email, 'seo_meta', req.params.pageKey)
  return res.json({ ok: true, payload })
})

app.get('/api/site', (_req, res) => {
  const siteSettings = getSiteSettings()
  res.json({
    site: siteSettings?.site ?? {
      name: 'ARIPAN',
      legalName: 'ARIPAN Mithila Studio',
      tagline: 'Mithila painting, held with museum care.',
      url: 'https://www.aripan.art',
      email: 'jhaaditi286@gmail.com',
    },
    artist: siteSettings?.artist ?? { name: 'ARIPAN' },
    testimonials: siteSettings?.testimonials ?? [],
    products: readRows('products'),
    collections: readRows('collections'),
    galleryWorks: readRows('gallery_works'),
    articles: readRows('articles'),
    legalPages: readRows('legal_pages').reduce<Record<string, unknown>>((acc, page) => {
      acc[(page as { slug?: string }).slug ?? 'unknown'] = page
      return acc
    }, {}),
  })
})

app.get('/api/products', (_req, res) => res.json(readRows('products')))
app.get('/api/collections', (_req, res) => res.json(readRows('collections')))
app.get('/api/gallery', (_req, res) => res.json(readRows('gallery_works')))
app.get('/api/articles', (_req, res) => res.json(readRows('articles')))
app.get('/api/legal', (_req, res) => res.json(readRows('legal_pages')))

app.post('/api/admin/products', authRequired, (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })

  const input = parsed.data
  upsertRecord('products', input.id, input.slug, input)
  createAuditLog('product_upserted', { productId: input.id }, withAdminUser(req)?.email, 'product', input.id)
  return res.status(201).json({ ok: true, item: input })
})

app.put('/api/admin/products/:id', authRequired, (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })

  const input = parsed.data
  upsertRecord('products', input.id, input.slug, input)
  createAuditLog('product_updated', { productId: input.id }, withAdminUser(req)?.email, 'product', input.id)
  return res.json({ ok: true, item: input })
})

app.delete('/api/admin/products/:id', authRequired, (req, res) => {
  deleteRecord('products', req.params.id)
  createAuditLog('product_deleted', { productId: req.params.id }, withAdminUser(req)?.email, 'product', req.params.id)
  return res.json({ ok: true })
})

app.post('/api/admin/collections', authRequired, (req, res) => {
  const parsed = collectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  upsertRecord('collections', item.slug, item.slug, item)
  createAuditLog('collection_upserted', { slug: item.slug }, withAdminUser(req)?.email, 'collection', item.slug)
  return res.status(201).json({ ok: true, item })
})

app.put('/api/admin/collections/:slug', authRequired, (req, res) => {
  const parsed = collectionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  upsertRecord('collections', item.slug, item.slug, item)
  createAuditLog('collection_updated', { slug: item.slug }, withAdminUser(req)?.email, 'collection', item.slug)
  return res.json({ ok: true, item })
})

app.post('/api/admin/gallery', authRequired, (req, res) => {
  const parsed = gallerySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  upsertRecord('gallery_works', item.id, item.slug, item)
  createAuditLog('gallery_updated', { slug: item.slug }, withAdminUser(req)?.email, 'gallery_work', item.id)
  return res.status(201).json({ ok: true, item })
})

app.post('/api/admin/articles', authRequired, (req, res) => {
  const parsed = articleSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  upsertRecord('articles', item.slug, item.slug, item)
  createAuditLog('article_updated', { slug: item.slug }, withAdminUser(req)?.email, 'article', item.slug)
  return res.status(201).json({ ok: true, item })
})

app.post('/api/admin/legal/:slug', authRequired, (req, res) => {
  const parsed = legalSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues })
  const item = parsed.data
  upsertRecord('legal_pages', req.params.slug, req.params.slug, item)
  createAuditLog('legal_updated', { slug: req.params.slug }, withAdminUser(req)?.email, 'legal_page', req.params.slug)
  return res.json({ ok: true, item })
})

app.get('/api/admin/overview', authRequired, (_req, res) => {
  const counts = {
    products: readRows('products').length,
    collections: readRows('collections').length,
    galleryWorks: readRows('gallery_works').length,
    articles: readRows('articles').length,
    legalPages: readRows('legal_pages').length,
  }
  return res.json(counts)
})

app.get('/api/admin/orders', authRequired, (_req, res) => {
  return res.json(getAllOrdersForAdmin())
})

app.patch('/api/admin/orders/:id/status', authRequired, async (req, res) => {
  const parsed = z.object({
    status: z.enum(['pending', 'confirmed', 'processing', 'completed', 'paid', 'cancelled']).default('confirmed'),
  }).safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues })
  }
  const updated = updateOrderStatus(req.params.id, parsed.data.status)
  createAuditLog('order_status_updated', { orderId: req.params.id, status: parsed.data.status }, withAdminUser(req)?.email, 'order', req.params.id)
  return res.json(updated)
})

// Public content blocks (hero, statement) – no auth required
app.get('/api/content/blocks/:key', async (req, res) => {
  const { getSiteContentBlock } = await import('./db.js')
  const block = getSiteContentBlock(req.params.key)
  return res.json(block ?? { key: req.params.key, data: {} })
})

// Static media assets and admin panel
const mediaDir = path.resolve(__dirname, '../data/media')
fs.mkdirSync(mediaDir, { recursive: true })
app.use('/media', express.static(mediaDir))
app.use('/admin', express.static(adminRoot))

// Frontend SPA serving: if dist/ exists (built with vite), serve it; otherwise serve public/
const distRoot = path.resolve(__dirname, '../dist')
const distIndex = path.join(distRoot, 'index.html')

if (fs.existsSync(distIndex)) {
  app.use(express.static(distRoot))
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/admin')) {
      return next()
    }
    res.sendFile(distIndex)
  })
} else {
  app.use(express.static(publicRoot))
}

ensureSchema()
ensureAdminUser()
if (!hasSeedData()) {
  seedDatabase()
}

app.listen(config.port, '0.0.0.0', () => {
  console.log(`ARIPAN API listening on http://0.0.0.0:${config.port} (env: ${config.nodeEnv})`)
})