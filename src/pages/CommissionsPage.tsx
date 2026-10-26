import { type FormEvent, useState } from 'react'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE } from '@/lib/site'

export function CommissionsPage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const country = String(data.get('country') ?? '').trim()
    const budget = String(data.get('budget') ?? '').trim()
    const description = String(data.get('description') ?? '').trim()
    const consent = data.get('consent') === 'on'

    if (!email.includes('@')) {
      setError('Please enter a valid email.')
      return
    }
    if (!consent) {
      setError('Please confirm we may use these details to reply.')
      return
    }
    if (!budget || budget === '') {
      setError('Please select a budget range.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, country, budget, description }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = typeof body.error === 'string'
          ? body.error
          : Array.isArray(body.error)
            ? body.error.map((e: { message: string }) => e.message).join(', ')
            : 'Something went wrong. Please try again.'
        setError(msg)
        return
      }

      setDone(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wrap page-hero">
      <Seo
        title="Commissions"
        description="Request a custom Mithila painting from ARIPAN. We collect only what is needed to understand the project."
        path="/commissions"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Commissions', path: '/commissions' },
        ])}
      />
      <p className="eyebrow">Studio</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>Commissions</h1>
      <p className="lede">
        Custom work is accepted when the brief can honour Mithila grammar — not when it asks the painting to become a logo.
      </p>
      <div className="grid-2" style={{ marginTop: '3rem', alignItems: 'start' }}>
        <div>
          <p>Tell us the room, the companions you wish to keep (tree, kohbar, portrait, cosmos), and a budget range. Reference images are optional and used only for this conversation.</p>
          <p className="muted">{SITE.responseTime} Files stay with the enquiry; we do not use them to train models or for marketing.</p>
        </div>
        {done ? (
          <p className="success">Received. We will write to the address you gave with a considered reply — not an automated quote.</p>
        ) : (
          <form className="form" onSubmit={onSubmit}>
            <label>
              Name
              <input name="name" autoComplete="name" required />
            </label>
            <label>
              Email
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <label>
              Country
              <input name="country" autoComplete="country-name" required />
            </label>
            <label>
              Budget
              <select name="budget" required defaultValue="">
                <option value="" disabled>
                  Select a range
                </option>
                <option>Under NRs. 50,000</option>
                <option>NRs. 50,000–150,000</option>
                <option>NRs. 150,000–300,000</option>
                <option>Above NRs. 300,000</option>
                <option>Unsure — please advise</option>
              </select>
            </label>
            <label>
              Project description
              <textarea name="description" required placeholder="Room, scale, motifs, timeline…" />
            </label>
            <label className="consent">
              <input type="checkbox" name="consent" />
              <span>I consent to ARIPAN using these details solely to respond to this commission enquiry.</span>
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
