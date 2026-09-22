import { useEffect, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { artist, sampleTestimonials } from '@/data/artist'
import { useCatalogUtils } from '@/context/CatalogContext'
import { ArtworkCard } from '@/components/product/ArtworkCard'
import { Seo } from '@/components/seo/Seo'
import { orgSchema, webSiteSchema } from '@/lib/schema'
import { NewsletterBlock } from '@/components/ui/NewsletterBlock'

// ── Content-block types ────────────────────────────────────
type HeroBlock = {
  eyebrow?: string
  heading?: string
  subtext?: string
  // ordered list: {type:'image'|'video', url:string}
  media?: Array<{ type: 'image' | 'video'; url: string }>
}

type StatementBlock = {
  eyebrow?: string
  heading?: string
  image?: string
  paragraphs?: string[]
}

const DEFAULT_HERO: HeroBlock = {
  eyebrow: 'Mithila · Nepal',
  heading: 'ARIPAN',
  subtext:
    'Painting that still thinks like a wall — earth pigment, double line, and the living grammar of Mithila.',
  media: [{ type: 'image', url: '/artworks/tree-of-life.png' }],
}

const DEFAULT_STATEMENT: StatementBlock = {
  eyebrow: 'Artist statement',
  heading: 'A language, not a look',
  image: '/artworks/artist-at-work.png',
  paragraphs: artist.statement,
}

async function fetchBlock<T>(key: string): Promise<T | null> {
  try {
    const r = await fetch(`/api/content/blocks/${key}`)
    if (!r.ok) return null
    const j = await r.json()
    if (!j || typeof j !== 'object') return null
    if (j.data && typeof j.data === 'object' && Object.keys(j.data).length > 0) {
      return j.data as T
    }
    const keys = Object.keys(j).filter((k) => k !== 'key' && k !== 'data')
    if (keys.length > 0) {
      return j as T
    }
    return null
  } catch {
    return null
  }
}

function getYouTubeId(url: string): string | null {
  if (!url) return null
  try {
    const raw = url.trim()
    const str = raw.startsWith('http') ? raw : 'https://' + raw
    const u = new URL(str)
    if (u.hostname.includes('youtube.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' || parts[0] === 'v' || parts[0] === 'shorts') return parts[1]
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.replace(/^\//, '').split('?')[0]
    }
  } catch {}
  return null
}

// ── Hero background (image, video file, or YouTube) ───────
function HeroBackground({ media }: { media: HeroBlock['media'] }) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, reduce ? 0 : 80])
  const items = media?.length ? media : DEFAULT_HERO.media!

  // Cycle through slides every 6 s when there are multiple
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 6000)
    return () => clearInterval(t)
  }, [items.length])

  const current = items[idx]
  const ytId = getYouTubeId(current.url)

  const bgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
  }

  useEffect(() => {
    if (!ytId) return
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data && data.event === 'onStateChange' && data.info === 0) {
          const iframe = document.querySelector<HTMLIFrameElement>('#hero-yt-iframe')
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), '*')
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), '*')
          }
        }
      } catch {}
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [ytId])

  if (ytId) {
    // YouTube — embed as background iframe, muted autoplay loop, no controls
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <iframe
          id="hero-yt-iframe"
          key={ytId}
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&fs=0&enablejsapi=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '56.25vw',
            minHeight: '100vh',
            minWidth: '177.78vh',
            transform: 'translate(-50%, -50%) scale(1.25)',
            border: 'none',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
          title=""
        />
        {/* Transparent touch & click shield: prevents touch/tap from reaching YouTube mobile player */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            pointerEvents: 'auto',
            touchAction: 'pan-y',
            background: 'transparent',
          }}
          aria-hidden="true"
        />
      </div>
    )
  }

  if (current.type === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(current.url)) {
    return (
      <video
        key={current.url}
        src={current.url}
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline="true"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        style={bgStyle}
      />
    )
  }

  return (
    <motion.img
      key={current.url}
      style={{ ...bgStyle, y }}
      src={current.url}
      alt=""
      aria-hidden="true"
    />
  )
}

export function HomePage() {
  const { newestProducts, bestSellers, collections, galleryWorks } = useCatalogUtils()
  const newest = newestProducts(4)
  const featuredWall = galleryWorks.slice(0, 5)
  const instagram = galleryWorks.slice(2, 8)
  const reduce = useReducedMotion()

  const [hero, setHero] = useState<HeroBlock>(DEFAULT_HERO)
  const [statement, setStatement] = useState<StatementBlock>(DEFAULT_STATEMENT)

  useEffect(() => {
    const load = () => {
      fetchBlock<HeroBlock>('hero').then((b) => b && setHero(b))
      fetchBlock<StatementBlock>('statement').then((b) => b && setStatement(b))
    }
    load()

    // Poll every 5 seconds so admin changes appear live
    const interval = setInterval(load, 5000)

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

  const stmtParagraphs = statement.paragraphs?.length
    ? statement.paragraphs
    : DEFAULT_STATEMENT.paragraphs!

  return (
    <>
      <Seo
        title="ARIPAN — Mithila Art Studio"
        description="Enter the digital home of ARIPAN: original Mithila paintings, archival prints, and a gallery experience designed with museum manners."
        path="/"
        image="/artworks/tree-of-life.png"
        jsonLd={[orgSchema(), webSiteSchema()]}
      />

      {/* ── Hero ── */}
      <section className="hero" aria-label="Introduction">
        <HeroBackground media={hero.media} />
        <div className="hero-veil" />
        <div className="hero-copy">
          <p className="eyebrow" style={{ color: 'inherit' }}>
            {hero.eyebrow || DEFAULT_HERO.eyebrow}
          </p>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {hero.heading || DEFAULT_HERO.heading}
          </motion.h1>
          <p>{hero.subtext || DEFAULT_HERO.subtext}</p>
        </div>
      </section>

      {/* ── Newest arrivals ── */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Now in the studio</p>
              <h2>Newest arrivals</h2>
            </div>
            <Link to="/shop">View the catalogue</Link>
          </div>
          <div className="grid-4">
            {newest.map((p) => (
              <ArtworkCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured collections ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Rooms</p>
              <h2>Featured collections</h2>
            </div>
          </div>
          <div className="grid-5">
            {collections.map((c) => (
              <Link key={c.slug} className="card-link collection-card" to={`/collections/${c.slug}`}>
                <img src={c.image} alt="" width={400} height={520} loading="lazy" />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Artist statement ── */}
      <section className="section statement">
        <div className="wrap grid-2">
          <img
            src={statement.image || DEFAULT_STATEMENT.image}
            alt="A Mithila painter seated with paper, surrounded by lotus and bird motifs"
            loading="lazy"
          />
          <div>
            <p className="eyebrow">{statement.eyebrow || DEFAULT_STATEMENT.eyebrow}</p>
            <h2>{statement.heading || DEFAULT_STATEMENT.heading}</h2>
            {stmtParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="btn-row">
              <Link className="btn" to="/about">
                Read the biography
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured artwork ── */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Museum wall</p>
              <h2>Featured artwork</h2>
            </div>
            <Link to="/gallery">Enter the gallery</Link>
          </div>
          <div className="museum">
            {featuredWall.map((w) => (
              <Link key={w.id} to={`/gallery/${w.slug}`}>
                <img src={w.image} alt={w.title} loading="lazy" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Best sellers ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Often requested</p>
              <h2>Best sellers</h2>
            </div>
          </div>
          <div className="grid-4">
            {bestSellers()
              .slice(0, 4)
              .map((p) => (
                <ArtworkCard key={p.id} product={p} />
              ))}
          </div>
        </div>
      </section>

      {/* ── Studio diary ── */}
      <section className="section statement">
        <div className="wrap">
          <p className="eyebrow">Studio diary</p>
          <h2>From the courtyard</h2>
          <p className="sample-note">
            A sample arrangement of studio images — not a live Instagram feed, and not a claim of follower counts.
          </p>
          <div className="grid-6">
            {instagram.map((w) => (
              <a key={w.id} href="https://www.instagram.com/aripan.mithila" rel="noreferrer">
                <img src={w.image} alt={w.title} loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section">
        <div className="wrap">
          <p className="eyebrow">Voices</p>
          <h2>reflections</h2>
          <p className="sample-note">
             Customer reviews should not be read as social proof, without independent verification.
          </p>
          <div className="grid-3">
            {sampleTestimonials.map((t) => (
              <blockquote className="testimonial" key={t.id}>
                <p>"{t.quote}"</p>
                <footer className="muted">{t.attribution}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>


      {/* ── Newsletter ── */}
      <section className="section statement">
        <div className="wrap grid-2">
          <div>
            <p className="eyebrow">Letters</p>
            <h2>Studio notes, not promotions</h2>
            <p>Exhibitions, a new painting, or a journal essay — never a countdown, never a manufactured urgency.</p>
          </div>
          <NewsletterBlock />
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="cta-band">
        <p className="eyebrow" style={{ color: 'inherit' }}>
          Continue
        </p>
        <h2>Walk the collections, or begin a commission</h2>
        <p className="lede" style={{ color: 'inherit' }}>
          Original works, impressions, and custom paintings for rooms that can keep their time.
        </p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link className="btn" to="/collections" style={{ background: 'var(--ivory)', color: 'var(--ink)' }}>
            Explore collections
          </Link>
          <Link className="btn-ghost" to="/commissions">
            Commission artwork
          </Link>
        </div>
      </section>
    </>
  )
}
