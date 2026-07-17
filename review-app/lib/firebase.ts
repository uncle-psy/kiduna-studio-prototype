// Image upload via kinship-assets service → Google Cloud Storage

const ASSETS_API_URL =
  process.env.NEXT_PUBLIC_ASSETS_API_URL || 'http://localhost:4000/api/v1'

const MAX_SIZE_MB = 1
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

/**
 * Upload a single image file to GCP.
 * Validates size on the frontend before attempting upload.
 */
export async function uploadImage(file: File): Promise<string> {
  // Frontend size validation — catches before network call
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(
      `Maximum image size allowed is ${MAX_SIZE_MB} MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', 'offerings')

  const res = await fetch(`${ASSETS_API_URL}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || `Image upload failed (${res.status})`)
  }

  const data = await res.json()
  return data.url as string
}

/**
 * Upload multiple image files (up to 5) to GCP in parallel.
 * Returns array of URLs in the same order as input files.
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  if (files.length > 5) {
    throw new Error('Maximum 5 images allowed per offering.')
  }

  // Validate all files before uploading any
  for (const file of files) {
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error(
        `"${file.name}" exceeds the ${MAX_SIZE_MB} MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB). Please choose a smaller image.`
      )
    }
  }

  return Promise.all(files.map(uploadImage))
}