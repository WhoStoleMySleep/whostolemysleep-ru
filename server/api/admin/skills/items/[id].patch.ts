import { db } from '~~/server/db'
import { skill } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Partial<typeof skill.$inferInsert>>(event)

  const [updated] = await db
    .update(skill)
    .set(body)
    .where(eq(skill.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404 })
  await markDirty(['/ru/resume', '/en/resume'])
  return updated
})
