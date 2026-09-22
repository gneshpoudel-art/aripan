import { Link, useParams } from 'react-router-dom'
import { getArticle } from '@/data/journal'
import { formatDate } from '@/lib/format'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE } from '@/lib/site'
import { NotFoundPage } from './NotFoundPage'

export function ArticlePage() {
  const { slug = '' } = useParams()
  const article = getArticle(slug)
  if (!article) return <NotFoundPage />

  return (
    <article className="wrap page-hero">
      <Seo
        title={article.title}
        description={article.excerpt}
        path={`/journal/${article.slug}`}
        image={article.image}
        type="article"
        jsonLd={[
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Journal', path: '/journal' },
            { name: article.title, path: `/journal/${article.slug}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            datePublished: article.date,
            image: `${SITE.url}${article.image}`,
            author: { '@type': 'Person', name: SITE.name },
            publisher: { '@type': 'Organization', name: SITE.legalName },
            description: article.excerpt,
          },
        ]}
      />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/journal">Journal</Link>
        <span>/</span>
        <span>{article.title}</span>
      </nav>
      <p className="eyebrow">
        {formatDate(article.date)} · {article.readMinutes} minutes
      </p>
      <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', maxWidth: '18ch' }}>{article.title}</h1>
      <img src={article.image} alt="" style={{ margin: '2rem 0', maxHeight: '70vh', objectFit: 'cover', width: '100%' }} />
      <div className="prose">
        {article.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </article>
  )
}
