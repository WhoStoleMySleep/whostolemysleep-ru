import { db } from '~~/server/db'
import { skill } from '~~/server/db/schema'
import { markDirty } from '~~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ group_id: number; name: string; order: number }>(event)
  const [row] = await db.insert(skill).values(body).returning()
  await markDirty(['/ru/resume', '/en/resume'])
  return row
})
