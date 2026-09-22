import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { asc } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:     ['Admin: cache'],
    summary:  'Revalidation queue',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Paths waiting for a cache flush, oldest first', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, added_at: { type: 'string', format: 'date-time' } } } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async () => {
  return db.select().from(schema.pendingRevalidation)
    .orderBy(asc(schema.pendingRevalidation.added_at))
})
