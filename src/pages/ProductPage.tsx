import { Link, useParams } from 'react-router-dom'
import { useCatalogUtils } from '@/context/CatalogContext'
import { formatPrice } from '@/lib/format'
import { useStore } from '@/hooks/useStore'
import { useToast } from '@/context/ToastContext'
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
  const { showToast } = useToast()

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
  const isSold = product.availability === 'sold'
  const isReserved = product.availability === 'reserved'
  const availability = isSold
    ? 'Sold out'
    : isReserved
    ? 'Reserved'
    : product.availability === 'made-to-order'
    ? 'Made to order'
    : 'In the studio (Available)'

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
          <p className="price" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span>{formatPrice(product.price, product.currency)}</span>
            {isSold && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.2rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderRadius: '9999px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                }}
              >
                Sold Out
              </span>
            )}
          </p>
          <div dangerouslySetInnerHTML={{ __html: product.description }} />
          <p>
            <strong>
              {availability}
              {isSold && (
                <span style={{ marginLeft: '0.6rem', color: '#dc2626', fontWeight: 600 }}>
                  ● Sold Out
                </span>
              )}
            </strong>
            <br />
            {product.medium}
            <br />
            {product.dimensions} · {product.year}
            <br />
            SKU {product.sku}
          </p>
          <div className="btn-row">
            <button
              className={`btn ${isSold ? 'btn-sold' : ''}`}
              type="button"
              onClick={() => {
                if (isSold) {
                  showToast('Sold out — This artwork is no longer available.', 'error')
                  return
                }
                addToCart(product.slug)
              }}
              style={
                isSold
                  ? {
                      backgroundColor: '#71717a',
                      borderColor: '#71717a',
                      color: '#ffffff',
                      cursor: 'not-allowed',
                      opacity: 0.85,
                    }
                  : undefined
              }
            >
              {isSold ? 'Sold Out' : 'Add to cart'}
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

          {isSold && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '8px',
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: '#dc2626', fontSize: '0.95rem' }}>
                ● This original artwork has been sold
              </p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                This unique piece is in a private collection. You can enquire about a{' '}
                <Link to="/commissions" style={{ textDecoration: 'underline', color: 'var(--ink)' }}>
                  custom commission
                </Link>{' '}
                or browse other{' '}
                <Link to="/shop" style={{ textDecoration: 'underline', color: 'var(--ink)' }}>
                  available artworks
                </Link>.
              </p>
            </div>
          )}

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
