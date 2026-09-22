import { config } from './config.js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export type ProviderStatus = {
  googleConfigured: boolean
  supabaseConfigured: boolean
  googleClientId: string
  supabaseUrl: string
  summary: string
  supabaseStatus: 'ok' | 'pending' | 'error'
  googleStatus: 'ok' | 'pending' | 'error'
}

export function buildGoogleOAuthUrl(state?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5173/auth/google/callback'
  const base = 'https://accounts.google.com/o/oauth2/v2/auth'
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state ?? 'aripan-google-auth',
  })

  return `${base}?${params.toString()}`
}

export function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5173/auth/google/callback',
  }
}

export async function exchangeGoogleCode(code: string, redirectUri?: string) {
  const googleConfig = getGoogleOAuthConfig()
  if (!googleConfig.clientId || !googleConfig.clientSecret) {
    return {
      configured: false,
      error: 'Google OAuth is not configured.',
    }
  }

  const params = new URLSearchParams({
    code,
    client_id: googleConfig.clientId,
    client_secret: googleConfig.clientSecret,
    redirect_uri: redirectUri ?? googleConfig.redirectUri,
    grant_type: 'authorization_code',
  })

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!tokenResponse.ok) {
    return {
      configured: true,
      error: 'Failed to exchange Google authorization code.',
      status: tokenResponse.status,
    }
  }

  const tokenPayload = await tokenResponse.json() as {
    access_token?: string
    id_token?: string
    refresh_token?: string
    expires_in?: number
  }

  return {
    configured: true,
    tokens: tokenPayload,
  }
}

export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    return null
  }

  return await response.json() as {
    email?: string
    given_name?: string
    family_name?: string
    name?: string
    picture?: string
  }
}

export function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(decoded) as { email?: string; given_name?: string; family_name?: string; name?: string; picture?: string }
  } catch {
    return null
  }
}

export async function getSupabaseConnectivityStatus() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    return { configured: false, status: 'pending' as const }
  }

  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: config.supabaseKey,
        Authorization: `Bearer ${config.supabaseKey}`,
      },
    })

    if (response.ok || response.status === 401 || response.status === 404) {
      return { configured: true, status: 'ok' as const }
    }

    return { configured: true, status: 'error' as const, message: `Supabase responded with ${response.status}` }
  } catch {
    return { configured: true, status: 'error' as const, message: 'Supabase is unreachable.' }
  }
}

export function getProviderHealthSnapshot(): ProviderStatus {
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const supabaseConfigured = Boolean(config.supabaseUrl && config.supabaseKey)

  return {
    googleConfigured,
    supabaseConfigured,
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    supabaseUrl: config.supabaseUrl,
    summary: googleConfigured && supabaseConfigured ? 'ready' : 'pending',
    supabaseStatus: supabaseConfigured ? 'ok' : 'pending',
    googleStatus: googleConfigured ? 'ok' : 'pending',
  }
}

export function getSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseKey) {
    return null
  }

  return {
    url: config.supabaseUrl,
    key: config.supabaseKey,
    configured: true,
  }
}
