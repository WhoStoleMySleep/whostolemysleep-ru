import { db } from '~/server/db'
import * as schema from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~/server/utils/pending'

interface Bullet { text_ru: string; text_en: string }

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    company?: string
    position_ru?: string
    position_en?: string
    date_from?: string
    date_to?: string | null
    order?: number
    bullets?: Bullet[]
  }>(event)

  const { bullets, ...fields } = body

  const [updated] = await db
    .update(schema.experience)
    .set(fields)
    .where(eq(schema.experience.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404 })

  if (bullets !== undefined) {
    await db.delete(schema.experienceBullet).where(eq(schema.experienceBullet.experience_id, id))
    if (bullets.length) {
      await db.insert(schema.experienceBullet).values(
        bullets.map((b, i) => ({
          experience_id: id,
          text_ru:       b.text_ru,
          text_en:       b.text_en,
          order:         i,
        }))
      )
    }
  }

  await markDirty(['/ru', '/en', '/ru/resume', '/en/resume'])
  return updated
})
