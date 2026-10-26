/**
 * Supabase Storage helper for persistent media uploads.
 *
 * Bucket: "media" (public)
 * Files are stored at: media/<unique-filename>
 * Public URL format: <SUPABASE_URL>/storage/v1/object/public/media/<filename>
 */
import fs from 'node:fs'
import { getDB } from './db.js'

export const STORAGE_BUCKET = 'media'

/**
 * Ensure the "media" bucket exists (public, 50 MB file size limit).
 * Safe to call on every startup — does nothing if bucket already exists.
 */
export async function ensureStorageBucket(): Promise<void> {
  const sb = getDB()
  const { data: buckets } = await sb.storage.listBuckets()
  const exists = (buckets ?? []).some((b) => b.name === STORAGE_BUCKET)
  if (!exists) {
    const { error } = await sb.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 50 * 1024 * 1024, // 50 MB
      allowedMimeTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'image/svg+xml', 'image/gif', 'image/tiff', 'image/avif',
        'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon',
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
      ],
    })
    if (error && !error.message?.includes('already exists')) {
      throw new Error(`Failed to create storage bucket: ${error.message}`)
    }
    console.log(`[Storage] Created bucket "${STORAGE_BUCKET}" (public).`)
  }
}

/**
 * Upload a file from a local temp path to Supabase Storage.
 * Returns the permanent public URL.
 */
export async function uploadToStorage(params: {
  tempPath: string
  fileName: string
  mimeType: string
}): Promise<string> {
  const sb = getDB()
  const fileBuffer = fs.readFileSync(params.tempPath)

  const { error } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(params.fileName, fileBuffer, {
      contentType: params.mimeType,
      upsert: true,        // overwrite if same name (shouldn't happen with Date.now suffix)
      cacheControl: '31536000', // 1 year — files are immutable (unique names)
    })

  if (error) throw new Error(`Supabase Storage upload failed: ${error.message}`)

  // Build the public URL
  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(params.fileName)
  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage by its public URL or just the filename.
 * Silently ignores errors (e.g. file not found).
 */
export async function deleteFromStorage(fileNameOrUrl: string): Promise<void> {
  const sb = getDB()
  // Extract just the filename if a full URL was passed
  const fileName = fileNameOrUrl.includes('/storage/v1/object/public/')
    ? fileNameOrUrl.split(`/storage/v1/object/public/${STORAGE_BUCKET}/`).pop() ?? fileNameOrUrl
    : fileNameOrUrl
  await sb.storage.from(STORAGE_BUCKET).remove([fileName]).catch(() => {})
}
