import { Link } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { ArtworkCard } from '@/components/product/ArtworkCard'
import { SearchForm } from '@/components/ui/Dialog'
import { Seo } from '@/components/seo/Seo'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { featuredProducts } = useCatalogUtils()
  const recs = featuredProducts().slice(0, 3)

  return (
    <div className="not-found">
      <Seo title="Artwork not found" description="This artwork seems to have wandered away." path="/404" noindex />
      <p className="eyebrow">404</p>
      <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 3.6rem)' }}>This artwork seems to have wandered away.</h1>
      <p className="lede" style={{ marginInline: 'auto' }}>
        The wall is still here. The sheet may have been moved, renamed, or never hung.
      </p>
      <div className="btn-row" style={{ justifyContent: 'center' }}>
        <Link className="btn" to="/">
          Return home
        </Link>
        <Link className="btn-ghost" to="/gallery">
          Enter the gallery
        </Link>
      </div>
      <div style={{ maxWidth: '32rem', margin: '2rem auto 0', textAlign: 'left' }}>
        <SearchForm onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)} />
      </div>
      <h2 style={{ marginTop: '3rem' }}>You might stay with these</h2>
      <div className="grid-3 wrap" style={{ textAlign: 'left' }}>
        {recs.map((p) => (
          <ArtworkCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
