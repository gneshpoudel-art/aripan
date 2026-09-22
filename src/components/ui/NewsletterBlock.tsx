import { type FormEvent, useState } from 'react'

export function NewsletterBlock() {
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
      setError('Please consent to receive studio letters.')
      return
    }
    setError('')
    setDone(true)
  }

  if (done) {
    return <p className="success">Thank you. Letters will be rare and considered.</p>
  }

  return (
    <form className="newsletter" onSubmit={onSubmit} style={{ maxWidth: '28rem' }}>
      <label>
        Email
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label className="consent">
        <input type="checkbox" name="consent" />
        <span>I consent to occasional studio letters from ADITY. Unsubscribe whenever you wish.</span>
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn" type="submit">
        Subscribe
      </button>
    </form>
  )
}
