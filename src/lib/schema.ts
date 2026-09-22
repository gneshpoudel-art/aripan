import { SITE, absUrl } from '@/lib/site'

export function orgSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'LocalBusiness'],
    name: SITE.legalName,
    alternateName: SITE.name,
    url: SITE.url,
    email: SITE.email,
    image: absUrl(SITE.ogImage),
    foundingDate: String(SITE.foundingYear),
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.locality,
      addressRegion: SITE.region,
      addressCountry: SITE.countryCode,
    },
    sameAs: [SITE.instagram, SITE.facebook, SITE.tiktok],
  }
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/search?q={query}`,
      'query-input': 'required name=query',
    },
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.path),
    })),
  }
}
