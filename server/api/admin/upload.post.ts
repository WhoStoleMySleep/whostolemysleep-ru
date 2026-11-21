import { put } from '@vercel/blob'

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex')
const JPEG_SIGNATURE = Buffer.from('ffd8ff', 'hex')
const GIF_SIGNATURE = 'GIF8'
const RIFF_SIGNATURE = 'RIFF'
const WEBP_SIGNATURE = 'WEBP'
const WEBP_FORMAT_OFFSET = 8
const MAX_MEGABYTES = 8
const MAX_BYTES = MAX_MEGABYTES * 1024 * 1024

function matchesSignature(bytes: Buffer, signature: Buffer, offset = 0) {
  return bytes.subarray(offset, offset + signature.length).equals(signature)
}

function matchesAsciiSignature(bytes: Buffer, signature: string, offset = 0) {
  return bytes.subarray(offset, offset + signature.length).toString('ascii') === signature
}

/** What is accepted: file signature to the content type it is allowed to claim. */
const SIGNATURES: { type: string; ext: string; match: (bytes: Buffer) => boolean }[] = [
  { type: 'image/png',  ext: 'png',  match: bytes => matchesSignature(bytes, PNG_SIGNATURE) },
  { type: 'image/jpeg', ext: 'jpg',  match: bytes => matchesSignature(bytes, JPEG_SIGNATURE) },
  { type: 'image/gif',  ext: 'gif',  match: bytes => matchesAsciiSignature(bytes, GIF_SIGNATURE) },
  { type: 'image/webp', ext: 'webp', match: bytes => matchesAsciiSignature(bytes, RIFF_SIGNATURE)
    && matchesAsciiSignature(bytes, WEBP_SIGNATURE, WEBP_FORMAT_OFFSET) },
]

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: posts'],
    summary:     'Upload an image to blob storage',
    description: 'The type is taken from the file signature, not from the header. png, jpeg, gif and webp up to 8 MB are accepted.',
    security:    [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } },
    },
    responses: {
      200: { description: 'The public URL of the file', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', format: 'uri' } } } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      413: { description: 'File is larger than 8 MB', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      415: { description: 'Unsupported format', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
})

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const file = form?.find((f) => f.name === 'file')

  if (!file?.data?.length) throw createError({ statusCode: 400, message: 'No file' })

  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, message: `File is larger than ${MAX_BYTES / 1024 / 1024} MB` })
  }

  // The type comes from the bytes: the header and the extension are client-supplied and
  // cannot be trusted — otherwise html lands on the storage domain and opens as a page.
  const kind = SIGNATURES.find((signature) => signature.match(file.data))
  if (!kind) {
    throw createError({ statusCode: 415, message: 'Only png, jpeg, gif and webp images are accepted' })
  }

  const name = safeName(file.filename, kind.ext)

  const blob = await put(name, file.data, {
    access:           'public',
    contentType:      kind.type,
    addRandomSuffix:  true,
    token:            process.env.BLOB_READ_WRITE_TOKEN,
  })

  return { url: blob.url }
})

/** The name from the form is scrubbed: no paths, no unicode, no extra dots. */
function safeName(original: string | undefined, ext: string): string {
  const base = (original ?? 'upload')
    .split(/[\\/]/).pop()!
    .replace(/\.[^.]*$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `${base || 'upload'}.${ext}`
}
