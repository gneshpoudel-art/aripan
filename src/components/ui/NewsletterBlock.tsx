import { type FormEvent, useState } from 'react'
import { API_BASE } from '@/lib/api'

export function NewsletterBlock() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const consent = data.get('consent') === 'on'

    if (!email.includes('@')) {
      setError('Please enter a valid email.')
      return
    }
    if (!consent) {
      setError('Please consent to receive studio letters.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch(API_BASE + '/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: true }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error ?? 'Something went wrong. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return <p className="success">Thank you. Letters will be rare and considered.</p>
  }

  return (
    <form className="newsletter" onSubmit={onSubmit} style={{ maxWidth: '28rem' }}>
      <label>
        Letters from the studio
        <input type="email" name="email" autoComplete="email" placeholder="Email" required />
      </label>
      <label className="consent">
        <input type="checkbox" name="consent" />
        <span>I consent to occasional studio letters. I may unsubscribe at any time. We will not share this address.</span>
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn" type="submit" disabled={loading}>
        {loading ? 'Subscribing…' : 'Subscribe'}
      </button>
    </form>
  )
}
