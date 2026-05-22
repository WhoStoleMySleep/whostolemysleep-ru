import { db } from '~~/server/db'
import { skillGroup } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Partial<typeof skillGroup.$inferInsert>>(event)

  const [updated] = await db
    .update(skillGroup)
    .set(body)
    .where(eq(skillGroup.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404 })
  await markDirty(['/ru/resume', '/en/resume'])
  return updated
})
