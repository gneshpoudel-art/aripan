import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { ArtworkCard } from '@/components/product/ArtworkCard'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'

type Sort = 'newest' | 'title'

export function ShopPage() {
  const [params, setParams] = useSearchParams()
  const category = params.get('collection') ?? 'all'
  const [sort, setSort] = useState<Sort>('newest')
  const { products, collections } = useCatalogUtils()

  const collectionSlugs = collections.map((c) => c.slug)

  const list = useMemo(() => {
    const base = category === 'all' ? products : products.filter((p) => p.collections?.includes(category))
    return [...base].sort((a, b) => (sort === 'title' ? a.name.localeCompare(b.name) : +new Date(b.createdAt) - +new Date(a.createdAt)))
  }, [category, sort, products])

  function setCollection(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('collection')
    else next.set('collection', value)
    setParams(next)
  }

  return (
    <div className="wrap page-hero">
      <Seo
        title="Shop"
        description="A curated catalogue of ARIPAN's Mithila paintings, prints, apparel, and editions — names and images only, until you open a work."
        path="/shop"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
        ])}
      />
      <p className="eyebrow">Catalogue</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>Shop</h1>
      <p className="lede">A quiet inventory. Prices and details wait on each work's own page.</p>
      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filter by collection">
          <button type="button" className={`chip ${category === 'all' ? 'is-on' : ''}`} aria-pressed={category === 'all'} onClick={() => setCollection('all')}>
            All
          </button>
          {collectionSlugs.map((slug) => {
            const name = collections.find((c) => c.slug === slug)?.name ?? slug
            return (
              <button
                key={slug}
                type="button"
                className={`chip ${category === slug ? 'is-on' : ''}`}
                aria-pressed={category === slug}
                onClick={() => setCollection(slug)}
              >
                {name}
              </button>
            )
          })}
        </div>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort catalogue">
            <option value="newest">Newest</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>
      <div className="grid-4">
        {list.map((p) => (
          <ArtworkCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
