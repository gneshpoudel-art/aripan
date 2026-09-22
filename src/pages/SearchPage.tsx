import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { articles } from '@/data/journal'
import { ArtworkCard } from '@/components/product/ArtworkCard'
import { SearchForm } from '@/components/ui/Dialog'
import { Seo } from '@/components/seo/Seo'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const { searchCatalog } = useCatalogUtils()
  const { products: found, works } = useMemo(() => searchCatalog(q), [q, searchCatalog])
  const journalHits = articles.filter(
    (a) => q && (a.title.toLowerCase().includes(q.toLowerCase()) || a.excerpt.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <div className="wrap page-hero">
      <Seo title="Search" description="Search the ARIPAN catalogue, gallery, and journal." path="/search" />
      <p className="eyebrow">Look</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)' }}>Search</h1>
      <SearchForm defaultValue={q} onSearch={(next) => setParams({ q: next })} />
      {q ? (
        <>
          <h2 style={{ marginTop: '3rem' }}>Works</h2>
          {found.length === 0 ? <p>No catalogue matches.</p> : (
            <div className="grid-4">
              {found.map((p) => (
                <ArtworkCard key={p.id} product={p} />
              ))}
            </div>
          )}
          <h2 style={{ marginTop: '3rem' }}>Exhibition</h2>
          {works.length === 0 ? <p>No gallery matches.</p> : (
            <ul>
              {works.map((w) => (
                <li key={w.id}>
                  <Link to={`/gallery/${w.slug}`}>{w.title}</Link>
                </li>
              ))}
            </ul>
          )}
          <h2>Journal</h2>
          {journalHits.length === 0 ? <p>No essays match.</p> : (
            <ul>
              {journalHits.map((a) => (
                <li key={a.slug}>
                  <Link to={`/journal/${a.slug}`}>{a.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="muted">Begin with a motif, a title, or a word such as kohbar.</p>
      )}
    </div>
  )
}
