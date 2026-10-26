import { Link, useParams } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { formatPrice } from '@/lib/format'
import { useStore } from '@/hooks/useStore'
import { ArtworkCard } from '@/components/product/ArtworkCard'
import { ProductGallery } from '@/components/product/ProductGallery'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema, orgSchema } from '@/lib/schema'
import { absUrl, SITE } from '@/lib/site'
import { IconHeart, IconShare } from '@/components/ui/Icons'
import { NotFoundPage } from './NotFoundPage'

export function ProductPage() {
  const { slug = '' } = useParams()
  const { getProduct, relatedProducts, collections, loading } = useCatalogUtils()
  const product = getProduct(slug)
  const { addToCart, toggleWishlist, inWishlist } = useStore()

  if (!product) {
    if (loading) {
      return (
        <div className="wrap page-hero" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <p style={{ color: 'var(--ink-muted, #71717a)', fontStyle: 'italic' }}>Loading artwork…</p>
        </div>
      )
    }
    return <NotFoundPage />
  }

  const collection = product.collections?.length ? collections.find((c) => product.collections.includes(c.slug)) : undefined
  const related = relatedProducts(product)
  const wished = inWishlist(product.slug)
  const availability =
    product.availability === 'in-stock' ? 'In the studio' : product.availability === 'made-to-order' ? 'Made to order' : 'No longer available'
  const share = async () => {
    const url = absUrl(`/product/${product.slug}`)
    if (navigator.share) {
      await navigator.share({ title: product.name, url })
      return
    }
    await navigator.clipboard.writeText(url)
  }

  return (
    <div className="wrap page-hero">
      <Seo
        title={product.name}
        description={product.description}
        path={`/product/${product.slug}`}
        image={product.images[0]}
        type="product"
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            { name: product.name, path: `/product/${product.slug}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            image: product.images.map((src) => absUrl(src)),
            description: product.description,
            sku: product.sku,
            brand: { '@type': 'Brand', name: SITE.name },
            offers: {
              '@type': 'Offer',
              url: absUrl(`/product/${product.slug}`),
              priceCurrency: product.currency,
              price: product.price,
              availability:
                product.availability === 'sold' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
              seller: orgSchema(),
            },
          },
        ]}
      />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        {collection ? (
          <>
            <Link to={`/collections/${collection.slug}`}>{collection.name}</Link>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span>{product.name}</span>
      </nav>
      <div className="pdp">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          <p className="eyebrow">{collection?.name}</p>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>{product.name}</h1>
          <p className="price">{formatPrice(product.price, product.currency)}</p>
          <div dangerouslySetInnerHTML={{ __html: product.description }} />
          <p>
            <strong>{availability}</strong>
            <br />
            {product.medium}
            <br />
            {product.dimensions} · {product.year}
            <br />
            SKU {product.sku}
          </p>
          <div className="btn-row">
            <button className="btn" type="button" disabled={product.availability === 'sold'} onClick={() => addToCart(product.slug)}>
              Add to cart
            </button>
            <button className="btn-ghost" type="button" aria-pressed={wished} onClick={() => toggleWishlist(product.slug)}>
              <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                <IconHeart title="" filled={wished} />
                {wished ? 'Saved' : 'Save to wishlist'}
              </span>
            </button>
            <button className="btn-ghost" type="button" onClick={() => void share()}>
              <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                <IconShare title="" />
                Share
              </span>
            </button>
          </div>
          <h2 style={{ fontSize: '1.6rem', marginTop: '2.5rem' }}>The work</h2>
          <div dangerouslySetInnerHTML={{ __html: product.story }} />
          <ul>
            {product.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <h3>Shipping</h3>
          <p>{product.shipping}</p>
          <h3>Returns</h3>
          <p>{product.returns}</p>
        </div>
      </div>
      <h2>Related works</h2>
      <div className="grid-3">
        {related.map((p) => (
          <ArtworkCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
