import assert from 'node:assert/strict'
import test from 'node:test'
import { createMediaAssetRecord, optimizeMediaPayload, validateMediaUpload } from './media-pipeline.js'

test('media validation and pipeline metadata work correctly', () => {
  const valid = validateMediaUpload({
    originalName: 'painting.jpg',
    mimeType: 'image/jpeg',
    size: 150 * 1024,
    width: 1600,
    height: 1200,
  })

  assert.equal(valid.valid, true)

  const optimized = optimizeMediaPayload({
    fileName: 'painting.jpg',
    mimeType: 'image/jpeg',
    size: 150 * 1024,
    width: 1600,
    height: 1200,
  })

  assert.ok(optimized.webpUrl.includes('painting'))
  assert.ok(optimized.thumbnailUrl.includes('thumb'))

  const record = createMediaAssetRecord({
    kind: 'product',
    fileName: 'painting.jpg',
    url: 'https://cdn.example.com/painting.jpg',
    width: 1600,
    height: 1200,
    size: 150 * 1024,
    metadata: { source: 'upload' },
  })

  assert.equal(record.kind, 'product')
  assert.equal(record.fileName, 'painting.jpg')
})
