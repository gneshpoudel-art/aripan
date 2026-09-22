import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { useStore } from '@/hooks/useStore'
import { useAuth } from '@/context/AuthContext'
import { cartProducts } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import { Seo } from '@/components/seo/Seo'

type GpsState = 'idle' | 'loading' | 'detected' | 'denied' | 'error'

interface CheckoutForm {
  name: string
  age: string
  phone: string
  deliveryDate: string
  deliveryTime: string
  address: string
  notes: string
}

interface CustomerOrder {
  id: string
  status: string
  total: number
  items: Array<{ id: string; slug: string; name: string; quantity: number; price: number; image?: string; currency?: string }>
  metadata: {
    name?: string
    email?: string
    phone?: string
    age?: number | string
    deliveryDate?: string
    deliveryTime?: string
    address?: string
    location?: string
    notes?: string
    latitude?: number
    longitude?: number
    location_accuracy?: number
    location_url?: string
  }
  latitude?: number | null
  longitude?: number | null
  locationAccuracy?: number | null
  locationUrl?: string | null
  created_at: string
}

function getTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function CartPage() {
  const { cart, updateQty, removeFromCart, clearCart } = useStore()
  const { products } = useCatalogUtils()
  const { user, token } = useAuth()
  const lines = cartProducts(cart, products)
  const total = lines.reduce((n, l) => n + l.product.price * l.qty, 0)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CheckoutForm>({
    name: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    age: '',
    phone: '',
    deliveryDate: getTodayDateString(),
    deliveryTime: '14:00',
    address: '',
    notes: '',
  })

  // GPS state
  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number; url: string } | null>(null)
  const [gpsError, setGpsError] = useState('')

  // Order submission
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderError, setOrderError] = useState('')

  // Customer Order History state
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Edit Order Modal state
  const [editingOrder, setEditingOrder] = useState<CustomerOrder | null>(null)
  const [editForm, setEditForm] = useState<{ deliveryDate: string; deliveryTime: string; address: string; notes: string; phone: string }>({
    deliveryDate: '',
    deliveryTime: '',
    address: '',
    notes: '',
    phone: '',
  })
  const [updatingOrder, setUpdatingOrder] = useState(false)
  const [orderActionMsg, setOrderActionMsg] = useState('')

  // Edit modal GPS state
  const [editGpsState, setEditGpsState] = useState<GpsState>('idle')
  const [editGpsCoords, setEditGpsCoords] = useState<{ lat: number; lng: number; accuracy: number; url: string } | null>(null)
  const [editGpsError, setEditGpsError] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)

  // Sync user info if loaded after mount
  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, name: f.name || `${user.firstName} ${user.lastName}`.trim() }))
    }
  }, [user])

  // Fetch customer orders
  const loadOrders = async () => {
    if (!token) return
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/orders/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json() as CustomerOrder[]
        setOrders(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore network errors
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (token) {
      void loadOrders()
    } else {
      setOrders([])
    }
  }, [token])

  // Close modals on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        setEditingOrder(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleField(field: keyof CheckoutForm, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleGps() {
    if (!navigator.geolocation) {
      setGpsState('error')
      setGpsError('Geolocation is not supported by your browser.')
      return
    }
    setGpsState('loading')
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const accuracy = pos.coords.accuracy
        const url = `https://www.google.com/maps?q=${lat},${lng}`
        setGpsCoords({ lat, lng, accuracy, url })
        setGpsState('detected')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState('denied')
          setGpsError('Location access was denied. Please allow location permissions in your browser to proceed.')
        } else if (err.code === err.TIMEOUT) {
          setGpsState('error')
          setGpsError('Location request timed out. Please try again.')
        } else {
          setGpsState('error')
          setGpsError('Could not retrieve your location. Please ensure GPS is enabled.')
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return

    if (lines.length === 0) {
      setOrderError('Cart is empty. Please add artworks to your cart before submitting an enquiry.')
      return
    }

    if (!form.name.trim()) {
      setOrderError('Please enter your full name.')
      return
    }
    if (!form.phone.trim()) {
      setOrderError('Please enter your phone number.')
      return
    }
    if (!form.address.trim()) {
      setOrderError('Please enter your delivery address.')
      return
    }

    // MANDATORY GPS validation
    if (!gpsCoords) {
      setOrderError('Live GPS location is mandatory. Please click "Use My Current Location" before submitting.')
      return
    }

    setSubmitting(true)
    setOrderError('')

    const items = lines.map(({ product, qty }) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      quantity: qty,
      image: product.images?.[0] ?? '',
      currency: product.currency ?? 'NRS',
    }))

    const buyer = {
      name: form.name.trim(),
      age: form.age ? Number(form.age) : undefined,
      phone: form.phone.trim(),
      email: user?.email,
      deliveryDate: form.deliveryDate,
      deliveryTime: form.deliveryTime,
      address: form.address.trim(),
      notes: form.notes.trim(),
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lng,
      location_accuracy: gpsCoords.accuracy,
      location_url: gpsCoords.url,
    }

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentProvider: 'manual',
          paymentStatus: 'pending',
          buyer,
          items,
        }),
      })

      if (res.ok) {
        setOrderSuccess(true)
        clearCart()
        void loadOrders()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string | unknown[] }
        const msg = Array.isArray(data.error)
          ? (data.error as Array<{ message?: string }>).map(e => e.message ?? String(e)).join(', ')
          : String(data.error ?? 'Order could not be placed. Please try again.')
        setOrderError(msg)
      }
    } catch {
      setOrderError('Network error — please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Order Modal
  function handleOpenEdit(order: CustomerOrder) {
    const meta = order.metadata || {}
    setEditingOrder(order)
    setEditForm({
      deliveryDate: meta.deliveryDate || getTodayDateString(),
      deliveryTime: meta.deliveryTime || '14:00',
      address: meta.address || meta.location || '',
      notes: meta.notes || '',
      phone: meta.phone || '',
    })
    setOrderActionMsg('')
    setEditGpsState('idle')
    setEditGpsCoords(null)
    setEditGpsError('')
  }

  // GPS capture for edit modal
  function handleEditGps() {
    if (!navigator.geolocation) {
      setEditGpsState('error')
      setEditGpsError('Geolocation is not supported by your browser.')
      return
    }
    setEditGpsState('loading')
    setEditGpsError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const accuracy = pos.coords.accuracy
        const url = `https://www.google.com/maps?q=${lat},${lng}`
        setEditGpsCoords({ lat, lng, accuracy, url })
        setEditGpsState('detected')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setEditGpsState('denied')
          setEditGpsError('Location access was denied.')
        } else {
          setEditGpsState('error')
          setEditGpsError('Could not retrieve your location. Please ensure GPS is enabled.')
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  // Submit Order Edits
  async function handleSaveOrderEdit(e: FormEvent) {
    e.preventDefault()
    if (!token || !editingOrder) return
    setUpdatingOrder(true)
    setOrderActionMsg('')
    try {
      const body: Record<string, unknown> = { ...editForm }
      if (editGpsCoords) {
        body.latitude = editGpsCoords.lat
        body.longitude = editGpsCoords.lng
        body.location_accuracy = editGpsCoords.accuracy
        body.location_url = editGpsCoords.url
      }
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setEditingOrder(null)
        void loadOrders()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setOrderActionMsg(data.error || 'Failed to update order.')
      }
    } catch {
      setOrderActionMsg('Network error while updating order.')
    } finally {
      setUpdatingOrder(false)
    }
  }

  // Cancel Order
  async function handleCancelOrder(orderId: string) {
    if (!token) return
    const confirmed = window.confirm('Are you sure you want to cancel this enquiry / order?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Cancelled by customer' }),
      })
      if (res.ok) {
        void loadOrders()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        alert(data.error || 'Could not cancel order.')
      }
    } catch {
      alert('Network error while cancelling order.')
    }
  }

  return (
    <div className="wrap page-hero">
      <Seo title="Cart" description="Works reserved in your browser for the ARIPAN studio catalogue." path="/cart" noindex />
      <p className="eyebrow">Studio desk</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)' }}>Cart</h1>

      {lines.length === 0 ? (
        <div style={{ marginBottom: '3rem' }}>
          <p>
            The desk is empty. <Link to="/shop">Return to the catalogue.</Link>
          </p>
        </div>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start', marginBottom: '4rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {lines.map(({ product, qty }) => (
              <li key={product.slug} style={{ display: 'grid', gridTemplateColumns: '6rem 1fr auto', gap: '1rem', padding: '1.2rem 0', borderTop: '1px solid var(--line)' }}>
                <img src={product.images[0]} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '4px' }} />
                <div>
                  <Link to={`/product/${product.slug}`} style={{ fontWeight: 600 }}>{product.name}</Link>
                  <p className="muted" style={{ margin: '0.2rem 0' }}>{formatPrice(product.price)}</p>
                  <label style={{ fontSize: '0.82rem' }}>
                    Quantity
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={qty}
                      onChange={(e) => updateQty(product.slug, Number(e.target.value))}
                      style={{ maxWidth: '5rem', marginLeft: '0.5rem', padding: '0.2rem 0.4rem' }}
                    />
                  </label>
                </div>
                <button type="button" className="btn-ghost" onClick={() => removeFromCart(product.slug)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <aside style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' }}>
            <p className="price" style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>{formatPrice(total)}</p>
            <p className="muted" style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
              To complete your acquisition, please fill in your delivery details and enquiry directly with the studio.
            </p>
            <button
              id="enquire-to-purchase-btn"
              type="button"
              className="btn"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => { setShowModal(true); setOrderSuccess(false); setOrderError('') }}
            >
              Enquire to purchase
            </button>
          </aside>
        </div>
      )}

      {/* ── Customer Orders History Section ──────────────────────── */}
      {token && (
        <section style={{ marginTop: '3rem', paddingTop: '2.5rem', borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Studio acquisitions</p>
              <h2 style={{ fontSize: '1.8rem', marginTop: '0.3rem' }}>My Enquiries & Orders</h2>
            </div>
            {loadingOrders && <span className="muted" style={{ fontSize: '0.85rem' }}>Refreshing…</span>}
          </div>

          {orders.length === 0 ? (
            <p className="muted" style={{ fontStyle: 'italic' }}>
              No enquiries submitted yet. Artworks you enquire about will appear here with live tracking, edit, and cancellation controls.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {orders.map((order) => {
                const meta = order.metadata || {}
                const isCancelled = order.status === 'cancelled'
                const items = Array.isArray(order.items) ? order.items : []
                const locUrl = order.locationUrl || meta.location_url || (order.latitude && order.longitude ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : '')

                return (
                  <div
                    key={order.id}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      borderRadius: '1rem',
                      padding: '1.4rem 1.6rem',
                      opacity: isCancelled ? 0.75 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Enquiry #{order.id.slice(0, 8)}</span>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: isCancelled ? '#fee2e2' : order.status === 'completed' ? '#dcfce7' : '#fef3c7',
                              color: isCancelled ? '#991b1b' : order.status === 'completed' ? '#166534' : '#92400e',
                            }}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="muted" style={{ fontSize: '0.8rem', margin: '0.3rem 0 0 0' }}>
                          Placed on {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                          NRS {Number(order.total || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Items in this order */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                      {items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--bg)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                          {it.image && (
                            <img src={it.image} alt="" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{it.name || it.slug}</div>
                            <div className="muted" style={{ fontSize: '0.78rem' }}>
                              Qty: {it.quantity || 1} · NRS {Number(it.price || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery & GPS details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.84rem', background: 'var(--bg)', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div>
                        <span className="muted" style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Delivery Schedule</span>
                        <strong>📅 {meta.deliveryDate || 'Flexible'} {meta.deliveryTime ? `at ${meta.deliveryTime}` : ''}</strong>
                      </div>
                      <div>
                        <span className="muted" style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Address</span>
                        <span>🏠 {meta.address || meta.location || '—'}</span>
                      </div>
                      <div>
                        <span className="muted" style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Live Location</span>
                        {locUrl ? (
                          <a href={locUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'underline' }}>
                            📍 Open GPS Map
                          </a>
                        ) : (
                          <span className="muted">No GPS coordinates</span>
                        )}
                      </div>
                      {meta.notes && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span className="muted" style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Notes</span>
                          <span style={{ fontStyle: 'italic' }}>"{meta.notes}"</span>
                        </div>
                      )}
                    </div>

                    {/* Order Controls: Edit & Cancel */}
                    {!isCancelled && order.status !== 'completed' && (
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', border: '1px solid var(--line)' }}
                          onClick={() => handleOpenEdit(order)}
                        >
                          ✏️ Edit Details
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.3)' }}
                          onClick={() => void handleCancelOrder(order.id)}
                        >
                          ✕ Cancel Enquiry
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Checkout Modal ────────────────────────────────────── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enquiry form"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            ref={modalRef}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '1.25rem',
              padding: '2rem 2.4rem',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1.2rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.4rem', color: 'var(--text-muted)',
              }}
            >
              ✕
            </button>

            {orderSuccess ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'var(--accent)', margin: '0 auto 1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 style={{ marginBottom: '0.4rem', fontSize: '1.5rem', letterSpacing: '-0.01em' }}>Enquiry submitted</h2>
                <p className="muted" style={{ fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto' }}>
                  The ARIPAN studio has received your enquiry and will be in touch soon.
                </p>
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: '1.75rem' }}
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>Enquiry Details</h2>
                <form id="checkout-form" onSubmit={(e) => void handleSubmit(e)} noValidate>

                  {/* Email — pre-filled read-only */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Email
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      value={user?.email ?? ''}
                      readOnly
                      style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* Full name */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="checkout-name" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Full name <span style={{ color: 'crimson' }}>*</span>
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={e => handleField('name', e.target.value)}
                      placeholder="Your full name"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Age */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="checkout-age" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Age
                    </label>
                    <input
                      id="checkout-age"
                      type="number"
                      min={1}
                      max={120}
                      value={form.age}
                      onChange={e => handleField('age', e.target.value)}
                      placeholder="Your age"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Phone */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="checkout-phone" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Phone number <span style={{ color: 'crimson' }}>*</span>
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={e => handleField('phone', e.target.value)}
                      placeholder="+977-98-XXXXXXXX"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Delivery date + time (Pre-loaded with current year/date) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label htmlFor="checkout-date" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        Delivery date <span style={{ color: 'crimson' }}>*</span>
                      </label>
                      <input
                        id="checkout-date"
                        type="date"
                        required
                        value={form.deliveryDate}
                        onChange={e => handleField('deliveryDate', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-time" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        Delivery time <span style={{ color: 'crimson' }}>*</span>
                      </label>
                      <input
                        id="checkout-time"
                        type="time"
                        required
                        value={form.deliveryTime}
                        onChange={e => handleField('deliveryTime', e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="checkout-address" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Delivery address <span style={{ color: 'crimson' }}>*</span>
                    </label>
                    <input
                      id="checkout-address"
                      type="text"
                      required
                      value={form.address}
                      onChange={e => handleField('address', e.target.value)}
                      placeholder="Street name, landmark, city"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* MANDATORY Live GPS Location */}
                  <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--surface)', borderRadius: '8px', border: gpsCoords ? '1px solid #16a34a' : '1px dashed var(--line)' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      📍 Live GPS Location <span style={{ color: 'crimson' }}>*</span> <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>(Mandatory)</span>
                    </label>
                    <button
                      type="button"
                      id="checkout-gps-btn"
                      disabled={gpsState === 'loading'}
                      onClick={handleGps}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: gpsCoords ? '1px solid #16a34a' : '1px solid var(--line)',
                        borderRadius: '6px',
                        background: gpsCoords ? '#16a34a' : 'var(--bg)',
                        color: gpsCoords ? '#fff' : 'var(--text)',
                        cursor: gpsState === 'loading' ? 'wait' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {gpsState === 'loading' ? (
                        <>⏳ Capturing coordinates…</>
                      ) : gpsCoords ? (
                        <>✓ Location Detected</>
                      ) : (
                        <>📍 Use My Current Location</>
                      )}
                    </button>

                    {gpsCoords && (
                      <p style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '0.4rem', fontWeight: 500 }}>
                        ✓ GPS captured (±{Math.round(gpsCoords.accuracy)}m accuracy) —{' '}
                        <a
                          href={gpsCoords.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                        >
                          preview map
                        </a>
                      </p>
                    )}

                    {gpsError && (
                      <p style={{ fontSize: '0.78rem', color: 'crimson', marginTop: '0.4rem' }}>
                        {gpsError}
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label htmlFor="checkout-notes" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Additional notes
                    </label>
                    <textarea
                      id="checkout-notes"
                      rows={3}
                      value={form.notes}
                      onChange={e => handleField('notes', e.target.value)}
                      placeholder="Gift wrapping, special instructions…"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  {orderError && (
                    <p style={{ color: 'crimson', fontSize: '0.9rem', marginBottom: '1rem', padding: '0.6rem 0.8rem', background: '#fee2e2', borderRadius: '6px' }}>
                      {orderError}
                    </p>
                  )}

                  <button
                    id="checkout-submit-btn"
                    type="submit"
                    className="btn"
                    disabled={submitting}
                    style={{ width: '100%', opacity: submitting ? 0.6 : 1 }}
                  >
                    {submitting ? 'Submitting…' : 'Submit Enquiry'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Order Modal ──────────────────────────────────── */}
      {editingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit enquiry details"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingOrder(null) }}
        >
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '1.25rem',
              padding: '2rem 2.4rem',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setEditingOrder(null)}
              style={{
                position: 'absolute', top: '1rem', right: '1.2rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.4rem', color: 'var(--text-muted)',
              }}
            >
              ✕
            </button>

            <h2 style={{ marginBottom: '0.4rem', fontSize: '1.3rem' }}>
              Edit Enquiry #{editingOrder.id.slice(0, 8)}
            </h2>
            <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Update your delivery schedule or delivery address. Changes update live in the studio dashboard.
            </p>

            <form onSubmit={(e) => void handleSaveOrderEdit(e)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Delivery date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.deliveryDate}
                    onChange={(e) => setEditForm(f => ({ ...f, deliveryDate: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Delivery time
                  </label>
                  <input
                    type="time"
                    required
                    value={editForm.deliveryTime}
                    onChange={(e) => setEditForm(f => ({ ...f, deliveryTime: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Delivery address
                </label>
                <input
                  type="text"
                  required
                  value={editForm.address}
                  onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Phone number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* GPS Location Re-upload */}
              <div style={{ marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--surface)', borderRadius: '8px', border: editGpsCoords ? '1px solid #16a34a' : '1px dashed var(--line)' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  Update Live Location <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>(optional — updates GPS on record)</span>
                </label>
                <button
                  type="button"
                  disabled={editGpsState === 'loading'}
                  onClick={handleEditGps}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    border: editGpsCoords ? '1px solid #16a34a' : '1px solid var(--line)',
                    borderRadius: '6px',
                    background: editGpsCoords ? '#16a34a' : 'var(--bg)',
                    color: editGpsCoords ? '#fff' : 'var(--text)',
                    cursor: editGpsState === 'loading' ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {editGpsState === 'loading' ? 'Capturing…' : editGpsCoords ? 'Location Updated' : 'Use My Current Location'}
                </button>
                {editGpsCoords && (
                  <p style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '0.4rem', fontWeight: 500 }}>
                    GPS captured (±{Math.round(editGpsCoords.accuracy)}m) —{' '}
                    <a href={editGpsCoords.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                      preview map
                    </a>
                  </p>
                )}
                {editGpsError && (
                  <p style={{ fontSize: '0.78rem', color: 'crimson', marginTop: '0.4rem' }}>{editGpsError}</p>
                )}
              </div>

              {orderActionMsg && (
                <p style={{ color: 'crimson', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {orderActionMsg}
                </p>
              )}


              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditingOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={updatingOrder}
                >
                  {updatingOrder ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
