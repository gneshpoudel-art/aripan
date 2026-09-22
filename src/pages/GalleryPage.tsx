import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import type { Motif } from '@/data/catalog'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'

const motifs: { id: Motif | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'flora', label: 'Flora' },
  { id: 'fauna', label: 'Fauna' },
  { id: 'ritual', label: 'Ritual' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'cosmos', label: 'Cosmos' },
  { id: 'village', label: 'Village' },
]

export function GalleryPage() {
  const [motif, setMotif] = useState<Motif | 'all'>('all')
  const { galleryWorks } = useCatalogUtils()
  const works = useMemo(
    () => (motif === 'all' ? galleryWorks : galleryWorks.filter((w) => w.motifs.includes(motif))),
    [motif, galleryWorks],
  )

  return (
    <div className="wrap page-hero">
      <Seo
        title="Gallery"
        description="A digital exhibition of Mithila paintings by ARIPAN — masonry rooms for looking, with stories rather than prices."
        path="/gallery"
        image="/artworks/kohbar.png"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Gallery', path: '/gallery' },
        ])}
      />
      <p className="eyebrow">Exhibition</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>Gallery</h1>
      <p className="lede">Walk the works as you would a room. Commerce waits elsewhere.</p>
      <div className="filters" role="group" aria-label="Filter by motif">
        {motifs.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`chip ${motif === m.id ? 'is-on' : ''}`}
            aria-pressed={motif === m.id}
            onClick={() => setMotif(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="masonry">
        {works.map((w) => (
          <Link key={w.id} to={`/gallery/${w.slug}`}>
            <img src={w.image} alt={w.title} loading="lazy" />
            <p style={{ fontFamily: 'var(--serif)', fontSize: '1.2rem', margin: '0.6rem 0 0' }}>{w.title}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
