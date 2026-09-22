import { artist } from '@/data/artist'
import { collections, galleryWorks, products, type Product, type GalleryWork } from '@/data/catalog'
import { articles } from '@/data/journal'
import { legalPages } from '@/data/legal'

export type SitePayload = {
  site?: Record<string, unknown>
  artist?: typeof artist
  testimonials?: Array<{ id: string; quote: string; attribution: string }>
  products?: Product[]
  collections?: typeof collections
  galleryWorks?: GalleryWork[]
  articles?: typeof articles
  legalPages?: Record<string, typeof legalPages[keyof typeof legalPages]>
}

const key = 'aripan-site-data'

export function hydrateSiteData(payload: SitePayload) {
  if (payload.site) localStorage.setItem(key, JSON.stringify(payload))
}

export function readSiteData(): SitePayload | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SitePayload) : null
  } catch {
    return null
  }
}

export function getApiCatalog() {
  const stored = readSiteData()
  return {
    products: stored?.products ?? products,
    collections: stored?.collections ?? collections,
    galleryWorks: stored?.galleryWorks ?? galleryWorks,
    articles: stored?.articles ?? articles,
    artist: stored?.artist ?? artist,
    legalPages: stored?.legalPages ?? legalPages,
    testimonials: stored?.testimonials ?? [],
  }
}
