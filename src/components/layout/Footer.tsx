import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '@/lib/site'

export function Footer() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get('email') ?? '')
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
    setDone(true)
  }

  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <p className="logo" style={{ margin: '0 0 0.8rem' }}>
            <img src="/logo.png" alt="ARIPAN" style={{ height: '32px', display: 'block' }} />
          </p>
          <p className="muted">
            Mithila painting from Nepal. A studio that prefers the manners of a museum to those of a stall.
          </p>
          <p>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <br />
            {SITE.locality}, {SITE.region}, {SITE.country}
            <br />
            {SITE.responseTime}
          </p>
        </div>
        <div>
          <p className="eyebrow">Visit</p>
          <Link to="/gallery">Gallery</Link>
          <Link to="/collections">Collections</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/journal">Journal</Link>
          <Link to="/events">Events</Link>
          <Link to="/about">About</Link>
          <Link to="/commissions">Commissions</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <p className="eyebrow">Studio</p>
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href={SITE.facebook} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
          <a href={SITE.tiktok} target="_blank" rel="noopener noreferrer">
            TikTok
          </a>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/refunds">Refunds</Link>
          <Link to="/shipping">Shipping</Link>
          <Link to="/cookies">Cookies</Link>
          <Link to="/data-deletion">Data deletion</Link>
        </div>
        <div>
          <p className="eyebrow">Letters from the studio</p>
          {done ? (
            <p className="success">Thank you. We will write only when there is something worth the paper.</p>
          ) : (
            <form className="newsletter" onSubmit={onSubmit}>
              <label>
                Email
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <label className="consent">
                <input type="checkbox" name="consent" />
                <span>I consent to occasional studio letters. I may unsubscribe at any time. We will not share this address.</span>
              </label>
              {error ? <p className="error">{error}</p> : null}
              <button className="btn" type="submit">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
      <div className="wrap legal-row">
        <p>© {new Date().getFullYear()} ARIPAN. All artworks remain the artist’s copyright.</p>
        <p>Handmade in Mithila. Shown with museum care.</p>
      </div>
    </footer>
  )
}
