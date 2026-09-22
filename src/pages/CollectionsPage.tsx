import { Link } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE } from '@/lib/site'

export function CollectionsPage() {
  const { collections } = useCatalogUtils()

  return (
    <div className="wrap page-hero">
      <Seo
        title="Collections"
        description="Original Mithila paintings, archival prints, apparel, accessories, and limited editions from the ARIPAN studio."
        path="/collections"
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Collections', path: '/collections' },
          ]),
          ...collections.map((c) => ({
            '@context': 'https://schema.org',
            '@type': 'Collection',
            name: c.name,
            description: c.description,
            url: `${SITE.url}/collections/${c.slug}`,
            image: `${SITE.url}${c.image}`,
          })),
        ]}
      />
      <p className="eyebrow">Departments</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>Collections</h1>
      <p className="lede">Five rooms. Each with its own light.</p>
      <div className="grid-3" style={{ marginTop: '3rem' }}>
        {collections.map((c) => (
          <Link key={c.slug} className="card-link collection-card" to={`/collections/${c.slug}`}>
            <img src={c.hero} alt="" loading="lazy" />
            <h2 style={{ fontSize: '1.8rem', marginTop: '1rem' }}>{c.name}</h2>
            <p className="muted">{c.short}</p>
            <p>{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
