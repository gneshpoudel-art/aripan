import { type FormEvent, useState } from 'react'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'

export function DataDeletionPage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (!String(data.get('email')).includes('@')) {
      setError('Please enter the email used in correspondence.')
      return
    }
    if (data.get('consent') !== 'on') {
      setError('Please confirm this request.')
      return
    }
    setError('')
    setDone(true)
  }

  return (
    <div className="wrap page-hero">
      <Seo
        title="Data deletion request"
        description="Ask ARIPAN to delete personal information held from contact, commission, or newsletter correspondence."
        path="/data-deletion"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Data deletion', path: '/data-deletion' },
        ])}
      />
      <p className="eyebrow">Privacy</p>
      <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>Data deletion</h1>
      <p className="lede">A clear request is enough. We do not ask for identity documents unless the law requires it.</p>
      <div className="prose">
        <p>
          Write with the email address you used. We will delete correspondence, newsletter records, and commission files tied to that address, except where we must keep a
          minimal invoice record of a completed sale.
        </p>
        <p>Wishlist and cart data live only in your browser. Clearing site data on your device removes them immediately.</p>
      </div>
      {done ? (
        <p className="success" style={{ marginTop: '2rem' }}>
          Request noted. You will receive confirmation at the address provided, usually within fourteen days.
        </p>
      ) : (
        <form className="form" style={{ maxWidth: '32rem', marginTop: '2rem' }} onSubmit={onSubmit}>
          <label>
            Email to delete
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Anything we should know
            <textarea name="notes" placeholder="Optional — e.g. a commission year" />
          </label>
          <label className="consent">
            <input type="checkbox" name="consent" />
            <span>I confirm I am requesting deletion of personal data associated with this email.</span>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn" type="submit">
            Submit request
          </button>
        </form>
      )}
    </div>
  )
}
