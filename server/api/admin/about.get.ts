import { db } from '~/server/db'
import * as schema from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const row = await db.query.aboutMe.findFirst({ where: eq(schema.aboutMe.id, 1) })
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
