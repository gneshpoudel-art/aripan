import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ensureMediaSeoTables,
  getMediaAsset,
  getPageSeoMeta,
  setMediaAsset,
  upsertPageSeoMeta,
} from './db.js'

test('media and seo metadata persist correctly', () => {
  ensureMediaSeoTables()

  setMediaAsset({
    id: 'asset-1',
    kind: 'product',
    fileName: 'flower-study.jpg',
    url: '/media/flower-study.jpg',
    width: 1200,
    height: 900,
    size: 240000,
  })

  upsertPageSeoMeta('shop', {
    title: 'Shop | ARIPAN',
    description: 'Browse original works by ARIPAN.',
    canonicalUrl: 'https://www.aripan.art/shop',
  })

  const media = getMediaAsset('asset-1')
  const seo = getPageSeoMeta('shop')

  assert.equal(media?.fileName, 'flower-study.jpg')
  assert.equal(seo?.title, 'Shop | ARIPAN')
})
