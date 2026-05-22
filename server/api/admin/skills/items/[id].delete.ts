import { db } from '~~/server/db'
import { skill } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(skill).where(eq(skill.id, id))
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
