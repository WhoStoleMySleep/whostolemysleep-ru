import { db } from '~~/server/db'
import { skillGroup } from '~~/server/db/schema'
import { markDirty } from '~~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ slug: string; name_ru: string; name_en: string; order: number }>(event)
  const [group] = await db.insert(skillGroup).values(body).returning()
  await markDirty(['/ru/resume', '/en/resume'])
  return group
})
