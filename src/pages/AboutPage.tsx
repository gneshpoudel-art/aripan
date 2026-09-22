import { useEffect, useState } from 'react'
import { artist as defaultArtist } from '@/data/artist'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'

export interface AboutContent {
  eyebrow?: string
  name?: string
  role?: string
  image?: string
  biography?: string[]
  processEyebrow?: string
  processHeading?: string
  process?: string[]
  inspirationsEyebrow?: string
  inspirationsHeading?: string
  inspirations?: string[]
  timelineEyebrow?: string
  timelineHeading?: string
  timeline?: Array<{ year: string; title: string; text: string }>
  exhibitionsEyebrow?: string
  exhibitionsHeading?: string
  exhibitions?: Array<{ place: string; note: string }>
  mediaEyebrow?: string
  mediaHeading?: string
  media?: Array<{ title: string; note: string }>
}

async function fetchAboutBlock(): Promise<AboutContent | null> {
  try {
    const r = await fetch('/api/content/blocks/biography')
    if (!r.ok) return null
    const j = await r.json()
    if (!j || typeof j !== 'object') return null
    if (j.data && typeof j.data === 'object' && Object.keys(j.data).length > 0) {
      return j.data as AboutContent
    }
    const keys = Object.keys(j).filter((k) => k !== 'key' && k !== 'data')
    if (keys.length > 0) {
      return j as AboutContent
    }
    return null
  } catch {
    return null
  }
}

export function AboutPage() {
  const [data, setData] = useState<AboutContent | null>(null)

  useEffect(() => {
    const load = () => {
      fetchAboutBlock().then((b) => {
        if (b) setData(b)
      })
    }
    load()

    // Poll every 5s for live updates
    const interval = setInterval(load, 5000)

    // Listen to tab broadcast channel for instantaneous sync
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('aripan_catalog')
      bc.onmessage = () => load()
    } catch {}

    const onFocus = () => load()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const eyebrow = data?.eyebrow || 'The artist'
  const name = data?.name || defaultArtist.name
  const role = data?.role || `${defaultArtist.role} · Nepal`
  const image = data?.image || '/artworks/artist-at-work.png'
  const biography = data?.biography?.length ? data.biography : defaultArtist.biography
  const processEyebrow = data?.processEyebrow || 'Process'
  const processHeading = data?.processHeading || 'How a painting arrives'
  const process = data?.process?.length ? data.process : defaultArtist.process
  const inspirationsEyebrow = data?.inspirationsEyebrow || 'Companions'
  const inspirationsHeading = data?.inspirationsHeading || 'Inspirations'
  const inspirations = data?.inspirations?.length ? data.inspirations : defaultArtist.inspirations
  const timelineEyebrow = data?.timelineEyebrow || 'Years'
  const timelineHeading = data?.timelineHeading || 'A studio timeline'
  const timeline = data?.timeline?.length ? data.timeline : defaultArtist.timeline
  const exhibitionsEyebrow = data?.exhibitionsEyebrow || 'Rooms'
  const exhibitionsHeading = data?.exhibitionsHeading || 'Exhibitions'
  const exhibitions = data?.exhibitions?.length ? data.exhibitions : defaultArtist.exhibitions
  const mediaEyebrow = data?.mediaEyebrow || 'Press'
  const mediaHeading = data?.mediaHeading || 'Media appearances'
  const media = data?.media?.length ? data.media : defaultArtist.media

  return (
    <div className="wrap page-hero">
      <Seo
        title={`About ${name}`}
        description={`Biography, process, exhibitions, and the Mithila heritage of artist ${name}, working from Nepal.`}
        path="/about"
        image={image}
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />
      <p className="eyebrow">{eyebrow}</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.8rem)' }}>{name}</h1>
      <p className="lede">{role}</p>
      <div className="grid-2" style={{ marginTop: '3rem' }}>
        <img src={image} alt={`${name} at work on a Mithila painting`} />
        <div>
          {biography.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>
      </div>
      <section className="section" style={{ paddingBottom: 0 }}>
        <p className="eyebrow">{processEyebrow}</p>
        <h2>{processHeading}</h2>
        {process.map((p, idx) => (
          <p key={idx} className="prose">
            {p}
          </p>
        ))}
      </section>
      <section className="section" style={{ paddingBottom: 0 }}>
        <p className="eyebrow">{inspirationsEyebrow}</p>
        <h2>{inspirationsHeading}</h2>
        <ul>
          {inspirations.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      </section>
      <section className="section" style={{ paddingBottom: 0 }}>
        <p className="eyebrow">{timelineEyebrow}</p>
        <h2>{timelineHeading}</h2>
        <div className="timeline">
          {timeline.map((t, idx) => (
            <article key={idx}>
              <p className="eyebrow">{t.year}</p>
              <div>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section" style={{ paddingBottom: 0 }}>
        <p className="eyebrow">{exhibitionsEyebrow}</p>
        <h2>{exhibitionsHeading}</h2>
        {exhibitions.map((e, idx) => (
          <p key={idx}>
            <strong>{e.place}.</strong> {e.note}
          </p>
        ))}
      </section>
      <section className="section">
        <p className="eyebrow">{mediaEyebrow}</p>
        <h2>{mediaHeading}</h2>
        {media.map((m, idx) => (
          <p key={idx}>
            <strong>{m.title}.</strong> {m.note}
          </p>
        ))}
      </section>
    </div>
  )
}
