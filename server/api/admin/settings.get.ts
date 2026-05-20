import { db } from '~/server/db'
import { settings } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  return row ?? null
})
