import { put } from '@vercel/blob'

/** Что принимаем: сигнатура файла → разрешённый content-type. */
const SIGNATURES: { type: string; ext: string; match: (bytes: Buffer) => boolean }[] = [
  { type: 'image/png',  ext: 'png',  match: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: 'image/jpeg', ext: 'jpg',  match: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/gif',  ext: 'gif',  match: (b) => b.subarray(0, 6).toString('ascii').startsWith('GIF8') },
  { type: 'image/webp', ext: 'webp', match: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
]

const MAX_BYTES = 8 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const file = form?.find((f) => f.name === 'file')

  if (!file?.data?.length) throw createError({ statusCode: 400, message: 'No file' })

  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, message: `File is larger than ${MAX_BYTES / 1024 / 1024} MB` })
  }

  // Тип определяем по содержимому: заголовок и расширение присылает клиент, верить им нельзя —
  // иначе на публичный домен хранилища уедет html, который откроется как страница.
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

/** Имя из формы чистим: путь, юникод и точки в нём нам не нужны. */
function safeName(original: string | undefined, ext: string): string {
  const base = (original ?? 'upload')
    .split(/[\\/]/).pop()!
    .replace(/\.[^.]*$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return `${base || 'upload'}.${ext}`
}
