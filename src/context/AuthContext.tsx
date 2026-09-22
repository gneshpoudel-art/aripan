import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type CustomerUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  marketingConsent: boolean
  role: 'customer'
}

type AuthContextType = {
  user: CustomerUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  signInWithGoogle: (returnTo?: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'aripan-customer-token'
const USER_KEY = 'aripan-customer-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<CustomerUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as CustomerUser) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(false)

  // Check for Google OAuth callback on page load (code in query params)
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const returnTo = url.searchParams.get('state') ?? '/'

    if (!code) return
    // Remove code from URL
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    window.history.replaceState({}, '', url.pathname + url.search)

    void (async () => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/auth/google/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            redirectUri: `${window.location.origin}/`,
          }),
        })
        if (res.ok) {
          const data = await res.json() as { token: string; user: CustomerUser }
          persistSession(data.token, data.user)
          // Navigate to return URL — Store.tsx will replay and clear the pending action
          window.location.href = decodeURIComponent(returnTo)
        }
      } catch (e) {
        console.error('Google OAuth callback error', e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  function persistSession(newToken: string, newUser: CustomerUser) {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const signInWithGoogle = useCallback(async (returnTo = '/') => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/auth/google?state=${encodeURIComponent(returnTo)}`)
      const data = await res.json() as { url: string; configured: boolean }
      if (data.configured && data.url) {
        window.location.href = data.url
      } else {
        // Google not configured — for dev, show a message
        console.warn('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')
        alert('Google Sign-In is not configured yet. Please contact the studio administrator.')
      }
    } catch (e) {
      console.error('Error initiating Google sign-in', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      signInWithGoogle,
      signOut,
    }),
    [user, token, isLoading, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
