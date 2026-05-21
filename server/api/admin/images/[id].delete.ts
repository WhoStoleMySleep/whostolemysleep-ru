import { del } from '@vercel/blob'
import { db } from '~/server/db'
import * as schema from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const [img] = await db.select().from(schema.image).where(eq(schema.image.id, id))
  if (!img) throw createError({ statusCode: 404, message: 'Not found' })

  const isBlob = img.url.includes('blob.vercel-storage.com')
  if (isBlob) await del(img.url, { token: process.env.BLOB_READ_WRITE_TOKEN })
  await db.delete(schema.image).where(eq(schema.image.id, id))

  return { ok: true }
})
