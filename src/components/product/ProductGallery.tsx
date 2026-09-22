import { useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const current = images[index] ?? images[0]

  return (
    <div>
      <button type="button" className="card-link" onClick={() => setZoom(true)} aria-label={`Zoom ${name}`}>
        <img src={current} alt={name} width={900} height={1200} />
      </button>
      {images.length > 1 ? (
        <div className="thumbs" role="tablist" aria-label="Artwork views">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-current={i === index}
              aria-label={`View ${i + 1}`}
              onClick={() => setIndex(i)}
            >
              <img src={src} alt="" width={90} height={110} />
            </button>
          ))}
        </div>
      ) : null}
      <Dialog open={zoom} title={name} onClose={() => setZoom(false)}>
        <img src={current} alt={`${name}, enlarged`} />
      </Dialog>
    </div>
  )
}
