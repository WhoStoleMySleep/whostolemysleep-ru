import { db } from '~/server/db'
import { skillGroup } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(skillGroup).where(eq(skillGroup.id, id))
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
