import { legalPages } from '@/data/legal'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'

type Key = keyof typeof legalPages

export function LegalPage({ page }: { page: Key }) {
  const doc = legalPages[page]
  const path = `/${page === 'privacy' ? 'privacy' : page === 'terms' ? 'terms' : page === 'refunds' ? 'refunds' : page === 'shipping' ? 'shipping' : 'cookies'}`
  return (
    <div className="wrap page-hero">
      <Seo
        title={doc.title}
        description={`${doc.title} for the ARIPAN studio website.`}
        path={path}
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: doc.title, path },
        ])}
      />
      <p className="eyebrow">Updated {doc.updated}</p>
      <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>{doc.title}</h1>
      <div className="prose" style={{ marginTop: '2rem' }}>
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2 style={{ fontSize: '1.7rem' }}>{s.heading}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
