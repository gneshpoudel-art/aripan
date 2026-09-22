import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { StoreContext, type CartLine, type Store, type Theme } from '@/context/store-context'
import { useAuth } from '@/context/AuthContext'
import { CookieConsentBanner, hasConsented } from '@/components/ui/CookieConsentBanner'
import { useToast } from '@/context/ToastContext'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, signInWithGoogle } = useAuth()
  const { showToast } = useToast()
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = read<Theme>('aripan-theme', 'gallery')
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', initial === 'vintage' ? 'vintage' : 'gallery')
    }
    return initial
  })
  const [cart, setCart] = useState<CartLine[]>(() => read('aripan-cart', []))
  const [wishlist, setWishlist] = useState<string[]>(() => read('aripan-wish', []))

  // Consent banner state
  const [consentPendingSlug, setConsentPendingSlug] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'vintage' ? 'vintage' : 'gallery')
    localStorage.setItem('aripan-theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => {
    localStorage.setItem('aripan-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem('aripan-wish', JSON.stringify(wishlist))
  }, [wishlist])

  // Replay pending cart action after Google OAuth redirect
  useEffect(() => {
    if (isAuthenticated) {
      const pendingAction = localStorage.getItem('aripan-pending-action')
      if (pendingAction) {
        try {
          const action = JSON.parse(pendingAction) as { type: string; slug: string }
          if (action.type === 'add_to_cart' && action.slug) {
            setCart((lines) => {
              const found = lines.find((l) => l.slug === action.slug)
              if (found) return lines.map((l) => (l.slug === action.slug ? { ...l, qty: l.qty + 1 } : l))
              return [...lines, { slug: action.slug, qty: 1 }]
            })
          }
        } catch {
          // ignore malformed data
        } finally {
          localStorage.removeItem('aripan-pending-action')
        }
      }
    }
  }, [isAuthenticated])

  // Called when the user accepts the consent banner
  const handleConsentAccept = useCallback(() => {
    const slug = consentPendingSlug
    setConsentPendingSlug(null)
    if (!slug) return

    if (!isAuthenticated) {
      localStorage.setItem('aripan-pending-action', JSON.stringify({ type: 'add_to_cart', slug }))
      void signInWithGoogle(window.location.pathname)
      return
    }
    setCart((lines) => {
      const found = lines.find((l) => l.slug === slug)
      if (found) return lines.map((l) => (l.slug === slug ? { ...l, qty: l.qty + 1 } : l))
      return [...lines, { slug, qty: 1 }]
    })
  }, [consentPendingSlug, isAuthenticated, signInWithGoogle])

  const handleConsentDecline = useCallback(() => {
    setConsentPendingSlug(null)
  }, [])

  const value = useMemo<Store>(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === 'vintage' ? 'gallery' : 'vintage')),
      cart,
      wishlist,
      addToCart: (slug) => {
        // Step 1: check cookie consent — show banner first if not yet given
        if (!hasConsented()) {
          setConsentPendingSlug(slug)
          return
        }

        // Step 2: require authentication
        if (!isAuthenticated) {
          localStorage.setItem('aripan-pending-action', JSON.stringify({ type: 'add_to_cart', slug }))
          void signInWithGoogle(window.location.pathname)
          return
        }

        // Step 3: add item to cart
        setCart((lines) => {
          const found = lines.find((l) => l.slug === slug)
          if (found) {
            showToast('Quantity updated in cart', 'success')
            return lines.map((l) => (l.slug === slug ? { ...l, qty: l.qty + 1 } : l))
          }
          showToast('Added to cart', 'success')
          return [...lines, { slug, qty: 1 }]
        })
      },
      updateQty: (slug, qty) =>
        setCart((lines) => (qty <= 0 ? lines.filter((l) => l.slug !== slug) : lines.map((l) => (l.slug === slug ? { ...l, qty } : l)))),
      removeFromCart: (slug) => setCart((lines) => lines.filter((l) => l.slug !== slug)),
      clearCart: () => setCart([]),
      toggleWishlist: (slug) =>
        setWishlist((ids) => {
          const isIn = ids.includes(slug)
          showToast(isIn ? 'Removed from favourites' : 'Added to favourites', isIn ? 'info' : 'success')
          return isIn ? ids.filter((id) => id !== slug) : [...ids, slug]
        }),
      inWishlist: (slug) => wishlist.includes(slug),
      cartCount: cart.reduce((n, l) => n + l.qty, 0),
      wishlistCount: wishlist.length,
    }),
    [theme, cart, wishlist, isAuthenticated, signInWithGoogle, showToast],
  )

  return (
    <StoreContext.Provider value={value}>
      {children}
      {consentPendingSlug !== null && (
        <CookieConsentBanner
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      )}
    </StoreContext.Provider>
  )
}
