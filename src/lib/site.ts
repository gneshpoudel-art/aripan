export const SITE = {
  name: 'ARIPAN',
  legalName: 'aripan Art Studio',
  tagline: 'Mithila painting, held with museum care.',
  description:
    'The digital home of ARIPAN, a Mithila artist presenting original paintings, prints, and textile works from Nepal.',
  url: 'https://www.aripan.art',
  email: 'studio@aripan.art',
  phoneLabel: 'By appointment',
  locality: 'Janakpur',
  region: 'Mithila',
  country: 'Nepal',
  countryCode: 'NP',
  instagram: 'https://www.instagram.com/aripan_aditi',
  facebook: 'https://www.facebook.com/aditi.jha.965928/',
  tiktok: 'https://www.tiktok.com/@aripan_aditi',
  responseTime: 'We reply within two to three business days.',
  ogImage: '/og.jpg',
  foundingYear: 2016,
} as const

export function absUrl(path = '/') {
  const normalised = path.startsWith('/') ? path : `/${path}`
  return `${SITE.url}${normalised}`
}
