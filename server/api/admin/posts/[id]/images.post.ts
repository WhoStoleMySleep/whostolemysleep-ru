import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const postId = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(postId)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody<{ url: string; alt_ru?: string; alt_en?: string }>(event)
  if (!body.url) throw createError({ statusCode: 400, message: 'url required' })

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(schema.image)
    .where(eq(schema.image.post_id, postId))

  const [created] = await db.insert(schema.image).values({
    post_id:  postId,
    url:      body.url,
    alt_ru:   body.alt_ru ?? '',
    alt_en:   body.alt_en ?? '',
    position: total,
  }).returning()

  return created
})
