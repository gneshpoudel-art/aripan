export type Article = {
  slug: string
  title: string
  excerpt: string
  date: string
  readMinutes: number
  image: string
  tags: string[]
  body: string[]
}

export const articles: Article[] = [
  {
    slug: 'walls-that-think',
    title: 'Walls That Think: Mithila Painting as Architecture',
    excerpt:
      'Before paper, there was plaster. A note on why Mithila painting still behaves like a house even when it travels as a sheet.',
    date: '2026-07-12',
    readMinutes: 8,
    image: '/artworks/village-courtyard.png',
    tags: ['heritage', 'process'],
    body: [
      'Mithila painting is often introduced as a folk style, which is a category invented by museums to keep certain rooms tidy. In the courtyards of the Mithila region in Nepal, the work is closer to architecture. It occupies the same plane as a door, a grain store, a threshold. It is meant to be lived beside, not glanced at from a corridor.',
      'When ARIPAN draws a Tree of Life on handmade paper, the composition is still thinking like a wall. The lower register holds water because a wall meets earth. The canopy is crowded because a wall must protect. Empty space is not a modernist luxury; it is a pause in speech.',
      'This is why the studio resists the language of “décor.” A painting that began as a house does not become a cushion cover without cost. Apparel and small objects exist in the ARIPAN catalogue, but they are fragments quotations of a larger grammar — never replacements for the wall.',
      'Visitors who stay with a work for more than a few seconds often begin counting fish, then birds, then the smaller triangles that fill a peacock’s neck. That counting is a form of reading. The painting is literate. It expects time.',
    ],
  },
  {
    slug: 'double-line',
    title: 'The Double Line',
    excerpt:
      'On the discipline of drawing twice, and why a Mithila contour is never only an outline.',
    date: '2026-05-02',
    readMinutes: 6,
    image: '/artworks/twin-peacocks.png',
    tags: ['process'],
    body: [
      'A single contour is efficient. Mithila painting is not interested in efficiency. The double line — two parallel paths that describe the same form — is a way of giving the figure a pulse.',
      'In the studio the first line is a decision. The second is a confirmation. Between them sits a narrow interval of ivory paper, a breath. Fill that interval too soon and the drawing becomes a cartoon. Leave it honest, and the form holds.',
      'Students visiting the studio often want to know which brush. The answer is less useful than they hope. What matters is the tempo: not so slow that the wrist stiffens, not so quick that the second line merely echoes the first. The two lines must be relatives, not twins.',
      'When a work is later printed, that interval is the first thing the file must protect. If the double line collapses, the painting is no longer speaking Mithila. It is merely busy.',
    ],
  },
  {
    slug: 'kohbar-notes',
    title: 'Notes from a Kohbar',
    excerpt:
      'Lotus, bamboo, fish, sun, moon — a brief lexicon of the nuptial chamber, written without the usual folklore brochure tone.',
    date: '2026-03-18',
    readMinutes: 7,
    image: '/artworks/kohbar.png',
    tags: ['heritage', 'ritual'],
    body: [
      'The Kohbar ghar is a room that teaches. Its images are not illustrations of a wedding; they are the wedding’s instruction manual, painted so that a couple may begin a household with the right companions: fertility, shelter, time, water.',
      'Lotus is not a brand mark. It is a structure of unfolding. Bamboo is continuity without rigidity. Fish are the refusal of scarcity. Sun and moon keep the room from belonging only to a single hour.',
      'ARIPAN’s Kohbar works are contemporary in their cropping and in their refusal of souvenir brightness, but they do not invent a private mythology. The studio’s task is fidelity with a living hand — to keep the diagram legible while allowing the pigment to remain earth, not enamel.',
      'Collectors sometimes ask whether a Kohbar may hang in a non-ceremonial room. It may. The painting does not require a wedding. It requires attention.',
    ],
  },
  {
    slug: 'paper-and-pigment',
    title: 'Paper, Pigment, Weather',
    excerpt:
      'A studio note on handmade sheets, soot, vermillion earth, and why the climate of Mithila, Nepal is part of the work.',
    date: '2026-01-09',
    readMinutes: 5,
    image: '/artworks/artist-at-work.png',
    tags: ['studio', 'process'],
    body: [
      'Handmade paper is not a rustic affectation. It is a surface that argues back. It drinks some colours and refuses others. It cockles if hurried. It records humidity. In that sense it is closer to plaster than to the industrial sheet.',
      'ARIPAN works with lampblack, ochre, and a muted vermillion mixed from earth. The palette is kept deliberately short. A long palette would let the painting compete with printed textiles. A short palette keeps the line in charge.',
      'Monsoon weeks change the drying. Winter light changes the black. These are not defects to be air-conditioned away; they are the calendar showing in the work. A painting that could have been made anywhere would not need to come from Nepal.',
    ],
  },
  {
    slug: 'exhibition-diary',
    title: 'Exhibition Diary: Rooms, Not Grids',
    excerpt:
      'How ARIPAN prefers to hang work and why the online gallery copies the tempo of a physical room.',
    date: '2025-11-21',
    readMinutes: 6,
    image: '/artworks/tree-of-life.png',
    tags: ['exhibitions', 'studio'],
    body: [
      'A grid is a storage system. An exhibition is a sentence. When ARIPAN hangs a room, the large work is given the far wall so that it can be approached. Smaller studies sit at the height of conversation. Nothing is stacked as if it were waiting to be priced.',
      'The website follows the same manners. Newest arrivals show a face and a name. Prices wait behind a door. The Gallery is for looking. The Shop is a catalogue, not a market stall.',
      'This is not disdain for commerce. It is a belief that commerce, if it is to be worthy of the painting, must borrow the tempo of a museum rather than the tempo of a feed.',
    ],
  },
]

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug)
}
