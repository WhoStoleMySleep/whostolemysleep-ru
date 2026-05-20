import { db } from '~/server/db'
import * as schema from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return db.select().from(schema.pendingRevalidation)
    .orderBy(asc(schema.pendingRevalidation.added_at))
})
