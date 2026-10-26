import { artist, sampleTestimonials } from '../src/data/artist.js'
import { collections, galleryWorks, products, type Product } from '../src/data/catalog.js'
import { articles } from '../src/data/journal.js'
import { legalPages } from '../src/data/legal.js'

export function getSeedPayload() {
  return {
    site: {
      name: 'ARIPAN',
      legalName: 'ARIPAN Mithila Studio',
      tagline: 'Mithila painting, held with museum care.',
      description:
        'The digital home of ARIPAN, a Mithila artist presenting original paintings, prints, and textile works from Nepal.',
      url: 'https://www.aripan.art',
      email: 'jhaaditi286@gmail.com',
      instagram: 'https://www.instagram.com/aripan_aditi',
      facebook: 'https://www.facebook.com/aditi.jha.965928/',
      tiktok: 'https://www.tiktok.com/@aripan_aditi',
    },
    artist,
    testimonials: sampleTestimonials,
    products: products as Product[],
    collections,
    galleryWorks,
    articles,
    legalPages,
  }
}
