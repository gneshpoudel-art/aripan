import { Helmet } from 'react-helmet-async'
import { SITE, absUrl } from '@/lib/site'

type SeoProps = {
  title: string
  description: string
  path?: string
  image?: string
  type?: string
  jsonLd?: object | object[]
  noindex?: boolean
}

export function Seo({
  title,
  description,
  path = '/',
  image = SITE.ogImage,
  type = 'website',
  jsonLd,
  noindex,
}: SeoProps) {
  const url = absUrl(path)
  const img = image.startsWith('http') ? image : absUrl(image)
  const fullTitle = title.toLowerCase().includes('aripan') ? title : `${title} — ARIPAN`
  const graph = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex,nofollow" /> : <meta name="robots" content="index,follow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta property="og:site_name" content={SITE.name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      {graph.map((node, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(node)}
        </script>
      ))}
    </Helmet>
  )
}
