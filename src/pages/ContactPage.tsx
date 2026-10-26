import { type FormEvent, useState } from 'react'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE } from '@/lib/site'

export function ContactPage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    if (!String(data.get('email')).includes('@')) {
      setError('Please enter a valid email.')
      return
    }
    if (data.get('consent') !== 'on') {
      setError('Please consent to a reply.')
      return
    }
    setError('')
    setDone(true)
  }

  return (
    <div className="wrap page-hero">
      <Seo
        title="Contact"
        description="Write to the ARIPAN studio in Nepal. We reply within two to three business days."
        path="/contact"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ])}
      />
      <p className="eyebrow">Correspondence</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>Contact</h1>
      <div className="grid-2" style={{ marginTop: '2rem', alignItems: 'start' }}>
        <div>
          <p>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </p>
          <p>
            {SITE.legalName}
            <br />
            {SITE.locality}, {SITE.region}, {SITE.country}
            <br />
            Viewings {SITE.phoneLabel.toLowerCase()}
          </p>
          <p>{SITE.responseTime} Press, collecting, and collaboration are all welcome; please say which in your subject line.</p>
          <p>
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            {' · '}
            <a href={SITE.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
            {' · '}
            <a href={SITE.tiktok} target="_blank" rel="noopener noreferrer">
              TikTok
            </a>
          </p>
        </div>
        {done ? (
          <p className="success">Thank you. A reply will follow from the studio address.</p>
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
              Subject
              <input name="subject" required />
            </label>
            <label>
              Message
              <textarea name="message" required />
            </label>
            <label className="consent">
              <input type="checkbox" name="consent" />
              <span>I consent to ARIPAN using this message to reply. Do not include unnecessary personal data.</span>
            </label>
            {error ? <p className="error">{error}</p> : null}
            <button className="btn" type="submit">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
