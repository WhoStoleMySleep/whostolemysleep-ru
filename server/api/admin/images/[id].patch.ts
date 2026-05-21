import { db } from '~/server/db'
import * as schema from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody<{ alt_ru?: string; alt_en?: string }>(event)

  const [updated] = await db
    .update(schema.image)
    .set({ alt_ru: body.alt_ru, alt_en: body.alt_en })
    .where(eq(schema.image.id, id))
    .returning()

  return updated
})
