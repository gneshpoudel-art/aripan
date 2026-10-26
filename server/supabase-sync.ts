// supabase-sync.ts
// Supabase is now the primary database. This module is kept for API compatibility.

export type SyncStatus = {
  configured: boolean
  status: 'ok' | 'pending' | 'error'
  message?: string
  lastSyncedAt?: string
  queueLength: number
}

export function getSupabaseSyncStatus(): SyncStatus {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { configured: false, status: 'pending', queueLength: 0, message: 'Supabase credentials not set.' }
  }
  return {
    configured: true,
    status: 'ok',
    message: 'Supabase is the live database — all writes go directly to Supabase PostgreSQL.',
    lastSyncedAt: new Date().toISOString(),
    queueLength: 0,
  }
}

export function queueSupabaseSync(_entity: string, _operation: string, _payload: Record<string, unknown>) {
  // No-op: Supabase is now the primary database, not a sync target.
  return { status: 'ok', message: 'Supabase is the live database.' }
}

export async function runSupabaseSync(_entity: string, _operation: string, _payload: Record<string, unknown> = {}) {
  // No-op: Supabase is now the primary database, not a sync target.
  return { status: 'ok', message: 'Supabase is the live database — sync is not needed.' }
}
