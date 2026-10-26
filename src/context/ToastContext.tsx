import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  /** Increments when the same message fires again — shows a "+N" badge */
  count: number
  /** Controls the CSS enter/exit animation */
  visible: boolean
}

export interface ToastContextValue {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURATION = 3200   // ms before auto-dismiss
const EXIT_MS  = 320    // must match CSS transition duration

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const scheduleRemove = useCallback((id: string) => {
    // cancel any existing timer for this id
    const old = timers.current.get(id)
    if (old) clearTimeout(old)

    const t = setTimeout(() => {
      // Start exit animation
      setToasts((prev) =>
        prev.map((toast) => (toast.id === id ? { ...toast, visible: false } : toast))
      )
      // Remove from DOM after transition completes
      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
        timers.current.delete(id)
      }, EXIT_MS)
      timers.current.set(id + '-exit', removeTimer)
    }, DURATION)

    timers.current.set(id, t)
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      setToasts((prev) => {
        // Deduplicate: if an identical message+type toast is already visible, bump its count and reset timer
        const existing = prev.find((t) => t.message === message && t.type === type && t.visible)
        if (existing) {
          scheduleRemove(existing.id)
          return prev.map((t) =>
            t.id === existing.id ? { ...t, count: t.count + 1 } : t
          )
        }
        const id = Math.random().toString(36).slice(2, 9)
        scheduleRemove(id)
        // Cap at 3 visible toasts
        const next = prev.length >= 3 ? prev.slice(1) : prev
        return [...next, { id, message, type, count: 1, visible: true }]
      })
    },
    [scheduleRemove]
  )

  const dismissToast = useCallback((id: string) => {
    const old = timers.current.get(id)
    if (old) clearTimeout(old)
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    )
    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, EXIT_MS)
    timers.current.set(id + '-exit', removeTimer)
  }, [])

  // Cleanup all timers on unmount
  useEffect(() => {
    const map = timers.current
    return () => { map.forEach(clearTimeout) }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}${toast.visible ? ' toast-enter' : ' toast-exit'}`}
            onClick={() => dismissToast(toast.id)}
            role="alert"
          >
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
            {toast.count > 1 && (
              <span className="toast-count">×{toast.count}</span>
            )}
            <button
              type="button"
              className="toast-close"
              onClick={(e) => { e.stopPropagation(); dismissToast(toast.id) }}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}