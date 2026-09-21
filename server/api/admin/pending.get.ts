import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { asc } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:     ['Админка: кеш'],
    summary:  'Очередь ревалидации',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Пути, ждущие сброса кеша, от старых к новым', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, added_at: { type: 'string', format: 'date-time' } } } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async () => {
  return db.select().from(schema.pendingRevalidation)
    .orderBy(asc(schema.pendingRevalidation.added_at))
})
