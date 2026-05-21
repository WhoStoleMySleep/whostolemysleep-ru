import { put } from '@vercel/blob'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const file = form?.find((f) => f.name === 'file')

  if (!file || !file.data) throw createError({ statusCode: 400, message: 'No file' })

  const filename = file.filename ?? `upload-${Date.now()}`
  const blob = await put(filename, file.data, {
    access: 'public',
    contentType: file.type ?? 'image/jpeg',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return { url: blob.url }
})
