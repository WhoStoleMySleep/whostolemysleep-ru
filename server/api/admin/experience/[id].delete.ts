import { db } from '~/server/db'
import { experience } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(experience).where(eq(experience.id, id))
  await markDirty(['/ru', '/en', '/ru/resume', '/en/resume'])
  return { ok: true }
})
