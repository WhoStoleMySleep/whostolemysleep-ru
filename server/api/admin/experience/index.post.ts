import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { markDirty } from '~~/server/utils/pending'

interface Bullet { text_ru: string; text_en: string }
interface Body {
  company: string
  position_ru: string
  position_en: string
  date_from: string
  date_to?: string | null
  order: number
  bullets: Bullet[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)

  const [exp] = await db.insert(schema.experience).values({
    company:     body.company,
    position_ru: body.position_ru,
    position_en: body.position_en,
    date_from:   body.date_from,
    date_to:     body.date_to ?? null,
    order:       body.order ?? 0,
  }).returning()

  if (body.bullets?.length) {
    await db.insert(schema.experienceBullet).values(
      body.bullets.map((b, i) => ({
        experience_id: exp!.id,
        text_ru:       b.text_ru,
        text_en:       b.text_en,
        order:         i,
      }))
    )
  }

  await markDirty(['/ru', '/en', '/ru/resume', '/en/resume'])
  return exp
})
