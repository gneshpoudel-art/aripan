import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const MEDIA_ROOT = path.resolve(process.cwd(), 'data', 'media')
fs.mkdirSync(MEDIA_ROOT, { recursive: true })

export function validateMediaUpload(input: {
  originalName: string
  mimeType: string
  size: number
  width?: number
  height?: number
}) {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/tiff',
    'image/x-tiff',
    'image/avif',
    'image/bmp',
    'image/x-ms-bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'application/octet-stream',
  ]
  const maxBytes = 50 * 1024 * 1024

  const fileName = input.originalName.toLowerCase()
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif',
    '.tif', '.tiff', '.avif', '.bmp', '.ico',
    '.mp4', '.webm', '.ogg', '.ogv', '.mov',
  ]
  const hasValidExt = allowedExtensions.some(ext => fileName.endsWith(ext))
  const isAllowedType = input.mimeType.startsWith('image/') || input.mimeType.startsWith('video/') || allowedMimeTypes.includes(input.mimeType) || hasValidExt
  const sizeValid = Number(input.size) > 0 && Number(input.size) <= maxBytes
  const dimensionsValid = (!input.width || !input.height) || (input.width > 0 && input.height > 0)

  return {
    valid: isAllowedType && hasValidExt && sizeValid && dimensionsValid,
    errors: [
      !isAllowedType || !hasValidExt ? 'Unsupported file format. Please upload an image (JPEG, PNG, WebP, SVG, GIF, TIFF, AVIF, BMP) or video (MP4, WebM, MOV).' : null,
      !sizeValid ? 'File exceeds the 50MB limit.' : null,
      !dimensionsValid ? 'File dimensions are invalid.' : null,
    ].filter(Boolean),
    maxBytes,
  }
}

export function optimizeMediaPayload(input: {
  fileName: string
  mimeType: string
  size: number
  width?: number
  height?: number
}) {
  const sanitized = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
  const ext = path.extname(sanitized) || '.jpg'
  const baseName = sanitized.replace(new RegExp(`${escapeRegExp(ext)}$`), '')
  const baseUrl = '/media'

  return {
    originalUrl: `${baseUrl}/${sanitized}`,
    webpUrl: `${baseUrl}/${baseName}.webp`,
    thumbnailUrl: `${baseUrl}/${baseName}-thumb.webp`,
    optimizedMimeType: 'image/webp',
    optimizedSize: Math.min(input.size, 900 * 1024),
    width: input.width ?? 1200,
    height: input.height ?? 900,
    storedPath: path.join(MEDIA_ROOT, `${baseName}.webp`),
    thumbnailPath: path.join(MEDIA_ROOT, `${baseName}-thumb.webp`),
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createMediaAssetRecord(input: {
  kind: string
  fileName: string
  url: string
  width?: number
  height?: number
  size?: number
  metadata?: Record<string, unknown>
}) {
  const id = crypto.randomUUID()
  return {
    id,
    kind: input.kind,
    fileName: input.fileName,
    url: input.url,
    width: input.width ?? 0,
    height: input.height ?? 0,
    size: input.size ?? 0,
    metadata: input.metadata ?? {},
    createdAt: new Date().toISOString(),
  }
}
