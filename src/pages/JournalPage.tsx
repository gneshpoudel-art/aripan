import { Link } from 'react-router-dom'
import { articles } from '@/data/journal'
import { formatDate } from '@/lib/format'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'

export function JournalPage() {
  return (
    <div className="wrap page-hero">
      <Seo
        title="Journal"
        description="Essays from the ARIPAN studio on Mithila culture, painting process, exhibitions, and paper."
        path="/journal"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Journal', path: '/journal' },
        ])}
      />
      <p className="eyebrow">Publication</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>Journal</h1>
      <p className="lede">Culture, process, and the weather of the studio.</p>
      <div className="grid-2" style={{ marginTop: '3rem', alignItems: 'start' }}>
        {articles.map((a) => (
          <Link key={a.slug} className="card-link journal-card" to={`/journal/${a.slug}`}>
            <img src={a.image} alt="" loading="lazy" />
            <p className="eyebrow">
              {formatDate(a.date)} · {a.readMinutes} min
            </p>
            <h2 style={{ fontSize: '1.8rem' }}>{a.title}</h2>
            <p>{a.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
