import { db } from '~/server/db'
import { education } from '~/server/db/schema'
import { markDirty } from '~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    institution: string
    specialization_ru: string
    specialization_en: string
    date_from: string
    date_to?: string | null
    order: number
  }>(event)

  const [row] = await db.insert(education).values({
    institution:       body.institution,
    specialization_ru: body.specialization_ru,
    specialization_en: body.specialization_en,
    date_from:         body.date_from,
    date_to:           body.date_to ?? null,
    order:             body.order ?? 0,
  }).returning()

  await markDirty(['/ru/resume', '/en/resume'])
  return row
})
