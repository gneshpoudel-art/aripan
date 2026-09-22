import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Product, GalleryWork } from '@/data/catalog'

type CatalogContextType = {
  products: Product[]
  collections: any[]
  galleryWorks: GalleryWork[]
  articles: any[]
  loading: boolean
  refresh: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextType | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Omit<CatalogContextType, 'refresh' | 'loading'>>({
    products: [],
    collections: [],
    galleryWorks: [],
    articles: [],
  })
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await fetch('/api/site')
      if (res.ok) {
        const payload = await res.json()
        setData({
          products: payload.products || [],
          collections: payload.collections || [],
          galleryWorks: payload.galleryWorks || [],
          articles: payload.articles || [],
        })
      }
    } catch (e) {
      console.error('Failed to fetch catalog', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // Poll every 5 seconds for updates
    const interval = setInterval(refresh, 5000)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('aripan_catalog')
      bc.onmessage = () => {
        void refresh()
      }
    } catch {}

    const onFocus = () => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      if (bc) bc.close()
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return (
    <CatalogContext.Provider value={{ ...data, loading, refresh }}>
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider')
  return ctx
}

export function useCatalogUtils() {
  const { products, collections, galleryWorks, articles } = useCatalog()

  return {
    products,
    collections,
    galleryWorks,
    articles,
    newestProducts: (count = 4) => [...products].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, count),
    featuredProducts: () => products.filter((p) => p.featured),
    bestSellers: () => products.filter((p) => p.bestSeller),
    productsByCollection: (slug: string) => products.filter((p) => p.collections?.includes(slug)),
    getProduct: (slug: string) => products.find((p) => p.slug === slug),
    relatedProducts: (product: Product, count = 3) => products.filter((p) => p.slug !== product.slug && (p.collections?.some((c: string) => product.collections?.includes(c)) || p.motifs.some((m: string) => product.motifs.includes(m)))).slice(0, count),
    getCollection: (slug: string) => collections.find((c) => c.slug === slug),
    getGalleryWork: (slug: string) => galleryWorks.find((w) => w.slug === slug),
    searchCatalog: (query: string) => {
      const q = query.trim().toLowerCase()
      if (!q) return { products: [], works: [] }
      const match = (text: string) => (text || '').toLowerCase().includes(q)
      return {
        products: products.filter((p) => match(p.name) || match(p.medium) || match(p.description) || p.motifs.some((m: string) => match(m))),
        works: galleryWorks.filter((w) => match(w.title) || match(w.story) || w.motifs.some((m: string) => match(m))),
      }
    }
  }
}
