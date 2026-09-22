import { Link } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { useStore } from '@/hooks/useStore'
import { ArtworkCard } from '@/components/product/ArtworkCard'
import { Seo } from '@/components/seo/Seo'

export function WishlistPage() {
  const { wishlist } = useStore()
  const { products } = useCatalogUtils()
  const items = products.filter((p) => wishlist.includes(p.slug))

  return (
    <div className="wrap page-hero">
      <Seo title="Wishlist" description="Works you have saved from the ARIPAN catalogue." path="/wishlist" noindex />
      <p className="eyebrow">Saved</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)' }}>Wishlist</h1>
      {items.length === 0 ? (
        <p>
          Nothing saved yet. <Link to="/gallery">Walk the gallery.</Link>
        </p>
      ) : (
        <div className="grid-4">
          {items.map((p) => (
            <ArtworkCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
