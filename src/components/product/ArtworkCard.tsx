import { Link } from 'react-router-dom'
import type { Product } from '@/data/catalog'

export function ArtworkCard({ product }: { product: Product }) {
  return (
    <Link className="card-link art-card" to={`/product/${product.slug}`}>
      <figure>
        <img src={product.images[0]} alt={product.name} width={640} height={800} loading="lazy" />
        <figcaption>{product.name}</figcaption>
      </figure>
    </Link>
  )
}
