import { useId, useRef, useEffect, type FormEvent } from 'react'

export type ConsentData = {
  email: string
  consented: true
  date: string
}

type Props = {
  onAccept: (email: string) => void
  onDecline: () => void
}

export const CONSENT_KEY = 'aripan-consent'

export function hasConsented(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return false
    const d = JSON.parse(raw) as Partial<ConsentData>
    return d.consented === true
  } catch {
    return false
  }
}

export function saveConsent(email: string): void {
  const data: ConsentData = { email, consented: true, date: new Date().toISOString() }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(data))
}

export function CookieConsentBanner({ onAccept, onDecline }: Props) {
  const emailId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !ref.current) return
      const focusable = ref.current.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    if (!email) {
      inputRef.current?.setCustomValidity('Please enter your email address.')
      inputRef.current?.reportValidity()
      return
    }
    saveConsent(email)
    onAccept(email)
  }

  function handleDecline() {
    onDecline()
  }

  return (
    <div
      className="consent-overlay"
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="consent-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        ref={ref}
        aria-hidden="false"
      >
        {/* Cookie icon */}
        <div className="consent-icon" aria-hidden="true">&#127850;</div>

        <h2 id="consent-title" className="consent-title">
          Before you continue
        </h2>
        <p className="consent-body">
          We use cookies and collect your email address to process your order
          enquiry and keep you updated about your purchase. Your data is stored
          securely and never shared with third parties.
        </p>
        <p className="consent-body" style={{ fontSize: '0.82rem', opacity: 0.7 }}>
          By clicking <strong>Accept &amp; Continue</strong> you agree to our{' '}
          <a href="/cookies" target="_blank" rel="noopener noreferrer">Cookie Policy</a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>

        <form className="consent-form form" onSubmit={handleSubmit} noValidate>
          <label htmlFor={emailId} className="consent-label">
            Your email address <span aria-hidden="true" style={{ color: 'var(--accent, #c8a96e)' }}>*</span>
          </label>
          <input
            id={emailId}
            ref={inputRef}
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="consent-input"
            onInput={() => inputRef.current?.setCustomValidity('')}
          />

          <div className="consent-actions">
            <button type="submit" className="btn consent-accept">
              Accept &amp; Continue
            </button>
            <button type="button" className="btn-ghost consent-decline" onClick={handleDecline}>
              Decline
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
