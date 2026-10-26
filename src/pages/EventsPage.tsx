import { useEffect, useState } from 'react'
import { Seo } from '@/components/seo/Seo'
import { breadcrumbSchema } from '@/lib/schema'

type Event = {
  id: string
  title: string
  slug: string
  date: string
  time: string | null
  description: string
  image: string | null
  entry_fee: string | null
  location: string | null
  status: 'upcoming' | 'ongoing' | 'past' | 'cancelled'
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  past: 'Past',
  cancelled: 'Cancelled',
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>('all')

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((data: Event[]) => {
        setEvents(Array.isArray(data) ? data : [])
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    filter === 'all' ? events : events.filter((e) => e.status === filter)



  return (
    <div className="wrap page-hero">
      <Seo
        title="Events"
        description="Discover upcoming exhibitions, workshops and cultural events by ARIPAN Mithila Studio."
        path="/events"
        jsonLd={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Events', path: '/events' },
        ])}
      />
      <p className="eyebrow">Studio calendar</p>
      <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)' }}>Events</h1>
      <p className="lede">
        Exhibitions, workshops, and cultural gatherings from the ARIPAN studio.
      </p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        {(['all', 'upcoming', 'ongoing', 'past'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '2rem',
              border: '1px solid var(--border)',
              background: filter === f ? 'var(--ink)' : 'transparent',
              color: filter === f ? 'var(--paper)' : 'var(--ink)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontFamily: 'var(--sans)',
              letterSpacing: '0.03em',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
            }}
          >
            {f === 'all' ? 'All events' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted" style={{ marginTop: '3rem' }}>Loading events…</p>
      ) : filtered.length === 0 ? (
        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
          <p className="muted">No events found. Check back soon.</p>
        </div>
      ) : (
        <div style={{ marginTop: '3rem' }}>
          {filtered.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event: ev }: { event: Event }) {
  const statusColors: Record<string, string> = {
    upcoming: '#2d6a4f',
    ongoing: '#1d3557',
    past: '#6b6b6b',
    cancelled: '#c0392b',
  }

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: ev.image ? '280px 1fr' : '1fr',
        gap: '2rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '2.5rem',
        marginBottom: '2.5rem',
        alignItems: 'start',
      }}
    >
      {ev.image && (
        <div
          style={{
            borderRadius: '4px',
            overflow: 'hidden',
            aspectRatio: '4 / 3',
            background: 'var(--surface)',
          }}
        >
          <img
            src={ev.image}
            alt={ev.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
      <div>
        {/* Status badge */}
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.7rem',
            fontFamily: 'var(--sans)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '0.2rem 0.6rem',
            borderRadius: '2rem',
            background: statusColors[ev.status] ?? '#6b6b6b',
            color: '#fff',
            marginBottom: '0.75rem',
          }}
        >
          {STATUS_LABEL[ev.status] ?? ev.status}
        </span>

        <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.7rem)', marginBottom: '0.5rem' }}>
          {ev.title}
        </h2>

        {/* Meta line */}
        <p
          className="muted"
          style={{ fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
        >
          <span>📅 {formatDate(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</span>
          {ev.location && <span>📍 {ev.location}</span>}
          {ev.entry_fee && (
            <span>
              🎟️ {ev.entry_fee.toLowerCase() === 'free' ? 'Free entry' : ev.entry_fee}
            </span>
          )}
        </p>

        <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ev.description}</p>
      </div>
    </article>
  )
}
