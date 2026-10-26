import { artist } from '@/data/artist'
import { collections, galleryWorks, products, type Product, type GalleryWork } from '@/data/catalog'
import { articles } from '@/data/journal'
import { legalPages } from '@/data/legal'

// Injected by Vite at build time from VITE_API_URL env var.
// Empty string in local dev (Vite proxies /api/* → localhost:4000).
// Full Vercel URL in production (e.g. https://aripan-two.vercel.app).
declare const __API_URL__: string

function getApiBase(): string {
  // 1. If Vite define injected a production URL (starts with http/https and is not localhost)
  if (
    typeof __API_URL__ !== 'undefined' &&
    __API_URL__ &&
    !__API_URL__.includes('localhost') &&
    !__API_URL__.includes('127.0.0.1')
  ) {
    return __API_URL__.replace(/\/+$/, '')
  }
  // 2. If running in browser and hostname is not localhost, use production backend
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return 'https://aripan-two.vercel.app'
    }
  }
  // 3. In local dev, empty string lets Vite dev server proxy /api to localhost:4000
  return ''
}

export const API_BASE: string = getApiBase()


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
  if (payload && (payload.site || payload.products?.length)) {
    try {
      localStorage.setItem(key, JSON.stringify(payload))
    } catch {}
  }
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
