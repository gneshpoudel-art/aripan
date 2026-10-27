import { Link } from 'react-router-dom'
import type { Product } from '@/data/catalog'

export function ArtworkCard({ product }: { product: Product }) {
  const isSold = product.availability === 'sold'

  return (
    <Link className="card-link art-card" to={`/product/${product.slug}`}>
      <figure style={{ position: 'relative' }}>
        <img src={product.images[0]} alt={product.name} width={640} height={800} loading="lazy" />
        {isSold && (
          <span
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              background: 'rgba(220, 38, 38, 0.92)',
              backdropFilter: 'blur(4px)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 2,
            }}
          >
            Sold Out
          </span>
        )}
        <figcaption>
          <span>{product.name}</span>
          {isSold && (
            <span style={{ marginLeft: '0.5rem', color: '#dc2626', fontSize: '0.82em', fontWeight: 600 }}>
              (Sold Out)
            </span>
          )}
        </figcaption>
      </figure>
    </Link>
  )
}
