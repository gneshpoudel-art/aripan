import { config } from './config.js'
import { getSupabaseClient } from './providers.js'

export type SyncStatus = {
  configured: boolean
  status: 'ok' | 'pending' | 'error'
  message?: string
  lastSyncedAt?: string
  queueLength: number
}

type SyncJob = {
  id: string
  entity: string
  operation: string
  payload: Record<string, unknown>
  status: 'queued' | 'running' | 'done' | 'failed'
  createdAt: string
}

const syncQueue: SyncJob[] = []

export function getSupabaseSyncStatus(): SyncStatus {
  const client = getSupabaseClient()
  if (!client) {
    return { configured: false, status: 'pending', queueLength: syncQueue.length }
  }

  return {
    configured: true,
    status: 'ok',
    message: 'Supabase client is configured and ready for synchronization.',
    lastSyncedAt: new Date().toISOString(),
    queueLength: syncQueue.length,
  }
}

export function queueSupabaseSync(entity: string, operation: string, payload: Record<string, unknown>) {
  const job: SyncJob = {
    id: `${entity}-${operation}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    entity,
    operation,
    payload,
    status: 'queued',
    createdAt: new Date().toISOString(),
  }

  syncQueue.push(job)
  return job
}

export async function runSupabaseSync(entity: string, operation: string, payload: Record<string, unknown> = {}) {
  const client = getSupabaseClient()
  const job = queueSupabaseSync(entity, operation, payload)

  if (!client) {
    return {
      ...job,
      status: 'pending',
      message: 'Supabase is not configured yet.',
    }
  }

  try {
    const response = await fetch(`${client.url}/rest/v1/${entity}`, {
      method: 'POST',
      headers: {
        apikey: client.key,
        Authorization: `Bearer ${client.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ operation, ...payload, syncedAt: new Date().toISOString() }),
    })

    if (!response.ok) {
      return {
        ...job,
        status: 'failed',
        message: `Supabase sync failed with ${response.status}`,
      }
    }

    return {
      ...job,
      status: 'done',
      message: 'Supabase sync completed.',
    }
  } catch (error) {
    return {
      ...job,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Supabase sync failed unexpectedly.',
    }
  }
}
