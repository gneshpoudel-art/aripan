import { Link, useParams } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'
import { NotFoundPage } from './NotFoundPage'
import { useEffect, useState } from 'react'

export function GalleryWorkPage() {
  const { slug = '' } = useParams()
  const { getGalleryWork, getProduct } = useCatalogUtils()
  const work = getGalleryWork(slug)
  const [full, setFull] = useState(false)
  useEffect(() => {
    if (!full) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [full])
  if (!work) return <NotFoundPage />
  const product = work.productSlug ? getProduct(work.productSlug) : undefined

  return (
    <div className="wrap page-hero">
      <Seo
        title={work.title}
        description={work.story}
        path={`/gallery/${work.slug}`}
        image={work.image}
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Gallery', path: '/gallery' },
          { name: work.title, path: `/gallery/${work.slug}` },
        ])}
      />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/gallery">Gallery</Link>
        <span>/</span>
        <span>{work.title}</span>
      </nav>
      <button type="button" className="card-link" onClick={() => setFull(true)} aria-label={`View ${work.title} fullscreen`}>
        <img src={work.image} alt={work.title} />
      </button>
      <div className="grid-2" style={{ marginTop: '2.5rem', alignItems: 'start' }}>
        <div>
          <p className="eyebrow">{work.year}</p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>{work.title}</h1>
          <p>{work.medium}</p>
        </div>
        <div>
          <p className="lede">{work.story}</p>
          {product ? (
            <p>
              <Link to={`/product/${product.slug}`}>If this work is in the catalogue, open its page.</Link>
            </p>
          ) : null}
        </div>
      </div>
      {full ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={work.title}>
          <button type="button" className="btn" style={{ position: 'absolute', top: '1rem', right: '1rem' }} onClick={() => setFull(false)}>
            Close
          </button>
          <img src={work.image} alt={work.title} />
        </div>
      ) : null}
    </div>
  )
}
