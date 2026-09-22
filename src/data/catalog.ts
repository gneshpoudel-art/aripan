export const collectionSlugs = [
  'original-art',
  'prints',
  'apparel',
  'accessories',
  'limited-editions',
] as const

export type CollectionSlug = (typeof collectionSlugs)[number] | (string & {})

export const collections: {
  slug: CollectionSlug
  name: string
  short: string
  description: string
  image: string
  hero: string
}[] = [
  {
    slug: 'original-art',
    name: 'Original Paintings',
    short: 'Pigment on handmade paper',
    description:
      'Singular works painted in the Mithila line — natural pigments, double contours, and the quiet density of a wall that has been studied for generations.',
    image: '/artworks/tree-of-life.png',
    hero: '/artworks/tree-of-life.png',
  },
  {
    slug: 'prints',
    name: 'Art Prints',
    short: 'Archival impressions',
    description:
      'Museum-grade reproductions of studio paintings, printed in limited runs on cotton rag so the linework remains as considered as the original.',
    image: '/artworks/twin-peacocks.png',
    hero: '/artworks/twin-peacocks.png',
  },
  {
    slug: 'apparel',
    name: 'Apparel',
    short: 'Wearable drawing',
    description:
      'Garments carrying medallions and border motifs from the studio — quiet enough for daily life, precise enough for the tradition they honour.',
    image: '/artworks/lotus-medallion.png',
    hero: '/artworks/lotus-medallion.png',
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    short: 'Small works, carried',
    description:
      'Stickers, scarves, and compact studies for those who wish to keep a fragment of the painting close without diminishing the original.',
    image: '/artworks/sacred-fish.png',
    hero: '/artworks/sacred-fish.png',
  },
  {
    slug: 'limited-editions',
    name: 'Limited Editions',
    short: 'Numbered studio editions',
    description:
      'Hand-finished impressions, signed and numbered, released only when a composition has been resolved to the artist’s satisfaction.',
    image: '/artworks/kohbar.png',
    hero: '/artworks/kohbar.png',
  },
]

export type Motif = 'flora' | 'fauna' | 'ritual' | 'portrait' | 'cosmos' | 'village' | (string & {})

export type Availability = 'in-stock' | 'made-to-order' | 'sold' | 'available' | 'reserved' | (string & {})

export type Product = {
  id: string
  slug: string
  name: string
  collections: CollectionSlug[]
  images: string[]
  createdAt: string
  price: number
  currency: 'NRS'
  availability: Availability
  medium: string
  dimensions: string
  year: number
  description: string
  story: string
  details: string[]
  shipping: string
  returns: string
  sku: string
  featured: boolean
  bestSeller: boolean
  motifs: Motif[]
  exhibitionOnly?: boolean
}

export const products: Product[] = [
  {
    id: 'p-bride',
    slug: 'bride-of-mithila',
    name: 'Bride of Mithila',
    collections: ['original-art'],
    images: ['/artworks/bride-of-mithila.png', '/artworks/kohbar.png', '/artworks/lotus-pond.png'],
    createdAt: '2026-08-28',
    price: 4200,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Natural pigment and ink on handmade paper',
    dimensions: '76 × 56 cm',
    year: 2026,
    description:
      'A seated bride framed by lotus and bird, painted in the ceremonial register of Mithila portraiture. The ornaments are drawn as architecture; the face remains still, as if listening to the wall.',
    story:
      'Wedding painting in Mithila is not costume illustration. It is a map of protection — lotus, fish, and sun arranged so the household may begin in balance. This work studies that grammar at the scale of a single figure.',
    details: [
      'Original unique work',
      'Unframed, shipped flat in archival board',
      'Certificate of authenticity included',
      'Studio stamp and signature on reverse',
    ],
    shipping: 'Packed in Nepal and dispatched worldwide with tracked fine-art courier. Typical transit is 7–18 days depending on destination. Duties, if any, are the recipient’s responsibility.',
    returns:
      'Original paintings may be returned within 14 days of delivery if the work is unaltered and in its original packing. Commissioned or custom-sized works are not returnable.',
    sku: 'AD-ORG-026-01',
    featured: true,
    bestSeller: false,
    motifs: ['portrait', 'ritual', 'flora'],
  },
  {
    id: 'p-bamboo',
    slug: 'bamboo-grove',
    name: 'Bamboo Grove',
    collections: ['original-art'],
    images: ['/artworks/bamboo-grove.png', '/artworks/village-courtyard.png'],
    createdAt: '2026-08-12',
    price: 2800,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Natural pigment on handmade paper',
    dimensions: '50 × 50 cm',
    year: 2026,
    description:
      'A grove drawn as a lattice of double lines, with birds holding the upper register and fish remembering water at the roots.',
    story:
      'Bamboo appears in Kohbar painting as a wish for continuity. Here it is treated as a living screen — not landscape in the Western sense, but a repeating prayer for shelter.',
    details: ['Original unique work', 'Unframed', 'Certificate of authenticity included'],
    shipping: 'Shipped flat with archival corners and tracked courier.',
    returns: '14-day return for unaltered original works in original packing.',
    sku: 'AD-ORG-026-02',
    featured: true,
    bestSeller: false,
    motifs: ['flora', 'fauna'],
  },
  {
    id: 'p-chandra',
    slug: 'chandra',
    name: 'Chandra',
    collections: ['original-art'],
    images: ['/artworks/chandra.png', '/artworks/surya.png'],
    createdAt: '2026-07-30',
    price: 3100,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Ink and earth pigment on handmade paper',
    dimensions: '70 × 50 cm',
    year: 2026,
    description:
      'Night assembled from lotus, owl, and a quiet disc of moon. The black is not empty; it is filled until it behaves like cloth.',
    story:
      'Mithila painting rarely isolates the sky. Chandra is always accompanied — by water, by bird, by the household that watches the calendar. This work keeps that companionship intact.',
    details: ['Original unique work', 'Unframed', 'Signed on reverse'],
    shipping: 'Tracked fine-art courier from Nepal.',
    returns: '14-day return for unaltered original works.',
    sku: 'AD-ORG-026-03',
    featured: true,
    bestSeller: true,
    motifs: ['cosmos', 'flora', 'fauna'],
  },
  {
    id: 'p-kurma',
    slug: 'kurma',
    name: 'Kurma',
    collections: ['original-art'],
    images: ['/artworks/kurma.png', '/artworks/lotus-pond.png'],
    createdAt: '2026-07-18',
    price: 2600,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Natural pigment on handmade paper',
    dimensions: '48 × 64 cm',
    year: 2026,
    description:
      'The tortoise as a patient architecture, carrying lotus and pond on a shell drawn with the same care as a courtyard floor.',
    story:
      'Kurma belongs to a cosmology of support. In the studio it is also a drawing problem: how to fill a dome without losing the animal’s weight.',
    details: ['Original unique work', 'Unframed'],
    shipping: 'Tracked courier, packed flat.',
    returns: '14-day return for unaltered original works.',
    sku: 'AD-ORG-026-04',
    featured: false,
    bestSeller: false,
    motifs: ['fauna', 'ritual', 'flora'],
  },
  {
    id: 'p-tree',
    slug: 'tree-of-life',
    name: 'Tree of Life',
    collections: ['original-art'],
    images: ['/artworks/tree-of-life.png', '/artworks/mango-parrots.png', '/artworks/village-courtyard.png'],
    createdAt: '2026-05-04',
    price: 6400,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Natural pigment, lampblack, and ochre on handmade paper',
    dimensions: '96 × 66 cm',
    year: 2026,
    description:
      'The tree as a complete household: fish at the waterline, peacocks in the canopy, and a density of pattern that asks to be read slowly, branch by branch.',
    story:
      'Tree of Life compositions are among the most demanding in the Mithila repertoire because they must hold many species without becoming a catalogue. This painting was developed over several months of drawing on the studio wall before it was committed to paper.',
    details: ['Original unique work', 'Unframed', 'Certificate of authenticity', 'Priority packing'],
    shipping: 'Crated or boarded according to destination. Insured transit.',
    returns: '14-day return for unaltered original works.',
    sku: 'AD-ORG-026-05',
    featured: true,
    bestSeller: true,
    motifs: ['flora', 'fauna'],
  },
  {
    id: 'p-surya',
    slug: 'surya',
    name: 'Surya',
    collections: ['original-art'],
    images: ['/artworks/surya.png', '/artworks/chandra.png'],
    createdAt: '2026-03-22',
    price: 2900,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Vermillion earth and ink on handmade paper',
    dimensions: '50 × 50 cm',
    year: 2026,
    description:
      'A radiating sun whose geometry is closer to embroidery than to astronomy — each ray a corridor of pattern.',
    story:
      'Surya paintings mark auspicious time. In ARIPAN’s studio they are also studies in circular composition: how far a disc can be filled before it loses light.',
    details: ['Original unique work', 'Unframed'],
    shipping: 'Tracked courier from the studio.',
    returns: '14-day return for unaltered original works.',
    sku: 'AD-ORG-026-06',
    featured: true,
    bestSeller: true,
    motifs: ['cosmos', 'ritual'],
  },
  {
    id: 'p-kohbar-ltd',
    slug: 'kohbar-chamber',
    name: 'Kohbar Chamber',
    collections: ['limited-editions'],
    images: ['/artworks/kohbar.png', '/artworks/bride-of-mithila.png'],
    createdAt: '2026-06-10',
    price: 780,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print with hand-applied vermillion on cotton rag',
    dimensions: '70 × 50 cm, edition of 25',
    year: 2026,
    description:
      'A numbered impression of the Kohbar composition, each sheet touched by hand so the central lotus is never mechanically identical.',
    story:
      'The Kohbar ghar is the nuptial chamber whose walls teach a couple how to live. This edition is offered as a portable wall — intimate, not theatrical.',
    details: ['Signed and numbered', 'Edition of 25 + 2 studio proofs', 'Hand-finished lotus centre'],
    shipping: 'Shipped flat, tracked and insured.',
    returns: 'Unused editions may be returned within 14 days.',
    sku: 'AD-LTD-026-01',
    featured: true,
    bestSeller: true,
    motifs: ['ritual', 'flora'],
  },
  {
    id: 'p-peacocks',
    slug: 'twin-peacocks',
    name: 'Twin Peacocks',
    collections: ['prints'],
    images: ['/artworks/twin-peacocks.png', '/artworks/mango-parrots.png'],
    createdAt: '2026-04-16',
    price: 180,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print on 310 gsm cotton rag',
    dimensions: '40 × 54 cm',
    year: 2025,
    description:
      'Two peacocks in mirrored courtship among lotuses — a study in bilateral grace printed from the studio painting.',
    story:
      'Peacocks in Mithila painting are not decorative fauna. They hold weather, monsoon, and vanity in the same body. The print preserves the density of the original hatch.',
    details: ['Open edition while the file remains current', 'Unframed', 'Colour-managed studio proofing'],
    shipping: 'Rolled in a stout tube or shipped flat by request.',
    returns: 'Unused prints may be returned within 14 days.',
    sku: 'AD-PRT-025-01',
    featured: true,
    bestSeller: true,
    motifs: ['fauna', 'flora'],
  },
  {
    id: 'p-pond',
    slug: 'lotus-pond',
    name: 'Lotus Pond',
    collections: ['prints'],
    images: ['/artworks/lotus-pond.png', '/artworks/sacred-fish.png'],
    createdAt: '2026-02-08',
    price: 160,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print on cotton rag',
    dimensions: '42 × 42 cm',
    year: 2025,
    description:
      'A square pond of lotus and fish, printed so the black contour remains as decisive as the brush.',
    story:
      'Water in Mithila painting is a populated field. Nothing is background. This print is for rooms that can tolerate that fullness.',
    details: ['Unframed', 'Studio colour proofed'],
    shipping: 'Rolled or flat.',
    returns: 'Unused prints may be returned within 14 days.',
    sku: 'AD-PRT-025-02',
    featured: false,
    bestSeller: true,
    motifs: ['flora', 'fauna'],
  },
  {
    id: 'p-fish-print',
    slug: 'sacred-fish',
    name: 'Sacred Fish',
    collections: ['prints'],
    images: ['/artworks/sacred-fish.png', '/artworks/lotus-pond.png'],
    createdAt: '2025-12-02',
    price: 140,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print on cotton rag',
    dimensions: '40 × 54 cm',
    year: 2025,
    description:
      'Fish drawn as blessings of abundance, their scales a grammar of triangles and dots.',
    story:
      'Matsya is fertility, river, and dinner. The painting refuses to choose among those meanings.',
    details: ['Unframed'],
    shipping: 'Rolled in a stout tube.',
    returns: 'Unused prints may be returned within 14 days.',
    sku: 'AD-PRT-025-03',
    featured: false,
    bestSeller: false,
    motifs: ['fauna', 'ritual'],
  },
  {
    id: 'p-elephant',
    slug: 'festive-elephant',
    name: 'Festive Elephant',
    collections: ['prints'],
    images: ['/artworks/festive-elephant.png', '/artworks/surya.png'],
    createdAt: '2025-11-14',
    price: 190,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print on cotton rag',
    dimensions: '42 × 42 cm',
    year: 2025,
    description:
      'An elephant dressed for procession, the saddle cloth treated as a second painting.',
    story:
      'Processional animals in Mithila work carry the village’s sense of occasion. This print is a study of how ornament can still leave the animal its weight.',
    details: ['Unframed'],
    shipping: 'Rolled or flat.',
    returns: 'Unused prints may be returned within 14 days.',
    sku: 'AD-PRT-025-04',
    featured: true,
    bestSeller: false,
    motifs: ['fauna', 'ritual'],
  },
  {
    id: 'p-village',
    slug: 'village-courtyard',
    name: 'Village Courtyard',
    collections: ['prints'],
    images: ['/artworks/village-courtyard.png', '/artworks/artist-at-work.png'],
    createdAt: '2025-09-20',
    price: 220,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print on cotton rag',
    dimensions: '32 × 56 cm',
    year: 2025,
    description:
      'A wide courtyard of painting women, mango shade, and a pond at the edge of the frame.',
    story:
      'Mithila painting began on walls. This composition remembers that origin without becoming nostalgia.',
    details: ['Unframed panoramic print'],
    shipping: 'Shipped in a wide tube.',
    returns: 'Unused prints may be returned within 14 days.',
    sku: 'AD-PRT-025-05',
    featured: false,
    bestSeller: false,
    motifs: ['village', 'portrait'],
  },
  {
    id: 'p-parrots',
    slug: 'mango-parrots',
    name: 'Mango Parrots',
    collections: ['prints'],
    images: ['/artworks/mango-parrots.png', '/artworks/tree-of-life.png'],
    createdAt: '2025-08-01',
    price: 150,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print on cotton rag',
    dimensions: '40 × 54 cm',
    year: 2025,
    description:
      'Parrots in a flowering mango, the canopy filled until it reads as textile.',
    story:
      'The mango tree is domestic plenty. The parrots keep it from becoming still life.',
    details: ['Unframed'],
    shipping: 'Rolled.',
    returns: 'Unused prints may be returned within 14 days.',
    sku: 'AD-PRT-025-06',
    featured: false,
    bestSeller: false,
    motifs: ['fauna', 'flora'],
  },
  {
    id: 'p-medallion-tee',
    slug: 'lotus-medallion-tunic',
    name: 'Lotus Medallion Tunic',
    collections: ['apparel'],
    images: ['/artworks/lotus-medallion.png', '/artworks/lotus-pond.png'],
    createdAt: '2026-06-22',
    price: 118,
    currency: 'NRS',
    availability: 'made-to-order',
    medium: 'Organic cotton, pigment print of studio medallion',
    dimensions: 'Made to order — sizes XS–XL, size guide on request',
    year: 2026,
    description:
      'A relaxed tunic carrying the circular lotus-and-fish medallion from the studio drawings. Printed small and off-centre so the cloth remains garment first.',
    story:
      'ARIPAN’s apparel is not merchandising of a painting. It is a second register: motif reduced until it can live on the body without shouting.',
    details: ['Made to order in 10–14 days', 'Organic cotton', 'Studio colour matched'],
    shipping: 'Folded and posted from the studio. International tracked mail.',
    returns: 'Unworn garments with tags may be returned within 14 days. Made-to-measure pieces are not returnable.',
    sku: 'AD-APP-026-01',
    featured: true,
    bestSeller: true,
    motifs: ['flora', 'fauna'],
  },
  {
    id: 'p-surya-scarf',
    slug: 'surya-scarf',
    name: 'Surya Scarf',
    collections: ['apparel'],
    images: ['/artworks/surya.png', '/artworks/lotus-medallion.png'],
    createdAt: '2026-01-18',
    price: 96,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Silk-cotton, digitally printed from studio drawing',
    dimensions: '90 × 90 cm',
    year: 2026,
    description:
      'A square scarf built around the Surya disc, with a quiet ivory field so the geometry can breathe.',
    story:
      'Scarves allow circular compositions to remain circular. The hem is left plain.',
    details: ['Hand-rolled edges', 'Limited dye lot'],
    shipping: 'Posted in a cloth wrap.',
    returns: 'Unworn items may be returned within 14 days.',
    sku: 'AD-APP-026-02',
    featured: false,
    bestSeller: false,
    motifs: ['cosmos'],
  },
  {
    id: 'p-fish-stickers',
    slug: 'fish-lotus-stickers',
    name: 'Fish & Lotus Studies',
    collections: ['accessories'],
    images: ['/artworks/sacred-fish.png', '/artworks/lotus-pond.png'],
    createdAt: '2026-05-20',
    price: 22,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival vinyl sticker set, six motifs',
    dimensions: 'Set of six, 5–8 cm each',
    year: 2026,
    description:
      'Six small studies — fish, lotus, sun, and border fragments — for notebooks and studio tools.',
    story:
      'These are working motifs, not mascots. They exist so the line can travel lightly.',
    details: ['Six stickers', 'Matte archival vinyl', 'Indoor use'],
    shipping: 'Letter post or included with larger orders.',
    returns: 'Unopened sets may be returned within 14 days.',
    sku: 'AD-ACC-026-01',
    featured: false,
    bestSeller: true,
    motifs: ['fauna', 'flora'],
  },
  {
    id: 'p-peacock-pouch',
    slug: 'peacock-pouch',
    name: 'Peacock Pouch',
    collections: ['accessories'],
    images: ['/artworks/twin-peacocks.png', '/artworks/lotus-medallion.png'],
    createdAt: '2025-10-09',
    price: 48,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Cotton canvas pouch with studio print',
    dimensions: '24 × 16 cm',
    year: 2025,
    description:
      'A small pouch printed with a fragment of Twin Peacocks, lined in unbleached cotton.',
    story:
      'A practical object, printed with enough of the painting to remain a fragment rather than a reduction.',
    details: ['Zip closure', 'Unbleached lining'],
    shipping: 'Posted from the studio.',
    returns: 'Unused items may be returned within 14 days.',
    sku: 'AD-ACC-025-02',
    featured: false,
    bestSeller: false,
    motifs: ['fauna'],
  },
  {
    id: 'p-artist-print',
    slug: 'studio-hour',
    name: 'Studio Hour',
    collections: ['prints'],
    images: ['/artworks/artist-at-work.png', '/artworks/village-courtyard.png'],
    createdAt: '2026-04-02',
    price: 170,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print on cotton rag',
    dimensions: '54 × 40 cm',
    year: 2026,
    description:
      'The painter at the page, surrounded by the same flora that appears in the finished works.',
    story:
      'This is not a portrait of celebrity. It is a record of posture — how a Mithila painter sits with paper.',
    details: ['Unframed'],
    shipping: 'Rolled.',
    returns: 'Unused prints may be returned within 14 days.',
    sku: 'AD-PRT-026-07',
    featured: false,
    bestSeller: false,
    motifs: ['portrait', 'village'],
  },
  {
    id: 'p-tree-ltd',
    slug: 'tree-of-life-edition',
    name: 'Tree of Life Edition',
    collections: ['limited-editions'],
    images: ['/artworks/tree-of-life.png', '/artworks/bamboo-grove.png'],
    createdAt: '2026-03-01',
    price: 920,
    currency: 'NRS',
    availability: 'in-stock',
    medium: 'Archival pigment print, hand-deckled, signed',
    dimensions: '80 × 55 cm, edition of 12',
    year: 2026,
    description:
      'A large impression of Tree of Life, deckled by hand and signed in graphite.',
    story:
      'Released only after the original painting left the studio wall. Twelve impressions, no reprints.',
    details: ['Edition of 12', 'Signed and numbered', 'Hand-deckled'],
    shipping: 'Boarded and insured.',
    returns: 'Unused editions may be returned within 14 days.',
    sku: 'AD-LTD-026-02',
    featured: true,
    bestSeller: false,
    motifs: ['flora', 'fauna'],
  },
]

export type GalleryWork = {
  id: string
  slug: string
  title: string
  year: number
  image: string
  medium: string
  size: 'large' | 'medium' | 'small'
  motifs: Motif[]
  story: string
  productSlug?: string
}

export const galleryWorks: GalleryWork[] = [
  {
    id: 'g1',
    slug: 'tree-of-life-wall',
    title: 'Tree of Life',
    year: 2026,
    image: '/artworks/tree-of-life.png',
    medium: 'Pigment on handmade paper',
    size: 'large',
    motifs: ['flora', 'fauna'],
    story:
      'A complete cosmology in a single trunk. Viewers are invited to read from water to canopy, as one would read a courtyard wall.',
    productSlug: 'tree-of-life',
  },
  {
    id: 'g2',
    slug: 'bride',
    title: 'Bride of Mithila',
    year: 2026,
    image: '/artworks/bride-of-mithila.png',
    medium: 'Pigment on handmade paper',
    size: 'medium',
    motifs: ['portrait', 'ritual'],
    story:
      'Ceremonial stillness. The jewellery is drawn as structure, not sparkle.',
    productSlug: 'bride-of-mithila',
  },
  {
    id: 'g3',
    slug: 'kohbar-wall',
    title: 'Kohbar',
    year: 2026,
    image: '/artworks/kohbar.png',
    medium: 'Pigment on handmade paper',
    size: 'large',
    motifs: ['ritual', 'flora'],
    story:
      'The nuptial diagram: lotus, bamboo, fish, sun, and moon arranged as instruction rather than ornament.',
    productSlug: 'kohbar-chamber',
  },
  {
    id: 'g4',
    slug: 'twin-peacocks-wall',
    title: 'Twin Peacocks',
    year: 2025,
    image: '/artworks/twin-peacocks.png',
    medium: 'Pigment on handmade paper',
    size: 'medium',
    motifs: ['fauna', 'flora'],
    story: 'Mirrored birds holding the monsoon between them.',
    productSlug: 'twin-peacocks',
  },
  {
    id: 'g5',
    slug: 'pond-wall',
    title: 'Lotus Pond',
    year: 2025,
    image: '/artworks/lotus-pond.png',
    medium: 'Pigment on handmade paper',
    size: 'small',
    motifs: ['flora', 'fauna'],
    story: 'Water as a populated field. Nothing is background.',
    productSlug: 'lotus-pond',
  },
  {
    id: 'g6',
    slug: 'surya-wall',
    title: 'Surya',
    year: 2026,
    image: '/artworks/surya.png',
    medium: 'Pigment on handmade paper',
    size: 'medium',
    motifs: ['cosmos', 'ritual'],
    story: 'A sun that behaves like embroidery — light made of corridors.',
    productSlug: 'surya',
  },
  {
    id: 'g7',
    slug: 'chandra-wall',
    title: 'Chandra',
    year: 2026,
    image: '/artworks/chandra.png',
    medium: 'Pigment on handmade paper',
    size: 'medium',
    motifs: ['cosmos'],
    story: 'Night filled until it becomes cloth.',
    productSlug: 'chandra',
  },
  {
    id: 'g8',
    slug: 'elephant-wall',
    title: 'Festive Elephant',
    year: 2025,
    image: '/artworks/festive-elephant.png',
    medium: 'Pigment on handmade paper',
    size: 'small',
    motifs: ['fauna', 'ritual'],
    story: 'Procession without spectacle. The animal keeps its weight.',
    productSlug: 'festive-elephant',
  },
  {
    id: 'g9',
    slug: 'courtyard-wall',
    title: 'Village Courtyard',
    year: 2025,
    image: '/artworks/village-courtyard.png',
    medium: 'Pigment on handmade paper',
    size: 'large',
    motifs: ['village', 'portrait'],
    story: 'Painting as a communal act, remembered at the scale of a courtyard.',
    productSlug: 'village-courtyard',
  },
  {
    id: 'g10',
    slug: 'bamboo-wall',
    title: 'Bamboo Grove',
    year: 2026,
    image: '/artworks/bamboo-grove.png',
    medium: 'Pigment on handmade paper',
    size: 'small',
    motifs: ['flora'],
    story: 'Shelter drawn as a repeating prayer.',
    productSlug: 'bamboo-grove',
  },
  {
    id: 'g11',
    slug: 'kurma-wall',
    title: 'Kurma',
    year: 2026,
    image: '/artworks/kurma.png',
    medium: 'Pigment on handmade paper',
    size: 'medium',
    motifs: ['fauna', 'ritual'],
    story: 'Support, patience, and the problem of filling a dome.',
    productSlug: 'kurma',
  },
  {
    id: 'g12',
    slug: 'parrots-wall',
    title: 'Mango Parrots',
    year: 2025,
    image: '/artworks/mango-parrots.png',
    medium: 'Pigment on handmade paper',
    size: 'small',
    motifs: ['fauna', 'flora'],
    story: 'Domestic plenty that refuses to become still life.',
    productSlug: 'mango-parrots',
  },
]

export function newestProducts(count = 4) {
  return [...products]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, count)
}

export function featuredProducts() {
  return products.filter((p) => p.featured)
}

export function bestSellers() {
  return products.filter((p) => p.bestSeller)
}

export function productsByCollection(slug: CollectionSlug) {
  return products.filter((p) => p.collections.includes(slug))
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug)
}

export function relatedProducts(product: Product, count = 3) {
  return products
    .filter((p) => p.slug !== product.slug && (p.collections.some((c) => product.collections.includes(c)) || p.motifs.some((m) => product.motifs.includes(m))))
    .slice(0, count)
}

export function getCollection(slug: string) {
  return collections.find((c) => c.slug === slug)
}

export function getGalleryWork(slug: string) {
  return galleryWorks.find((w) => w.slug === slug)
}

export function searchCatalog(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return { products: [] as Product[], works: [] as GalleryWork[] }
  const match = (text: string) => text.toLowerCase().includes(q)
  return {
    products: products.filter(
      (p) => match(p.name) || match(p.medium) || match(p.description) || p.motifs.some((m) => match(m)),
    ),
    works: galleryWorks.filter((w) => match(w.title) || match(w.story) || w.motifs.some((m) => match(m))),
  }
}
