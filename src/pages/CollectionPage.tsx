import { Link, useParams } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { ArtworkCard } from '@/components/product/ArtworkCard'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE } from '@/lib/site'
import { NotFoundPage } from './NotFoundPage'

export function CollectionPage() {
  const { slug = '' } = useParams()
  const { getCollection, productsByCollection } = useCatalogUtils()
  const collection = getCollection(slug)
  if (!collection) return <NotFoundPage />
  const items = productsByCollection(collection.slug)

  return (
    <>
      <Seo
        title={collection.name}
        description={collection.description}
        path={`/collections/${collection.slug}`}
        image={collection.hero}
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Collections', path: '/collections' },
            { name: collection.name, path: `/collections/${collection.slug}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Collection',
            name: collection.name,
            description: collection.description,
            url: `${SITE.url}/collections/${collection.slug}`,
            image: `${SITE.url}${collection.hero}`,
          },
        ]}
      />
      <section className="hero" style={{ minHeight: '70vh' }}>
        <img src={collection.hero} alt="" />
        <div className="hero-veil" />
        <div className="hero-copy">
          <p className="eyebrow" style={{ color: 'inherit' }}>
            Collection
          </p>
          <h1 style={{ fontSize: 'clamp(2.6rem, 7vw, 5rem)' }}>{collection.name}</h1>
          <p>{collection.description}</p>
        </div>
      </section>
      <div className="wrap section">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/collections">Collections</Link>
          <span>/</span>
          <span>{collection.name}</span>
        </nav>
        <div className="grid-4">
          {items.map((p) => (
            <ArtworkCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </>
  )
}
