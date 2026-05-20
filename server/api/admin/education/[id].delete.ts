import { db } from '~/server/db'
import { education } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(education).where(eq(education.id, id))
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
