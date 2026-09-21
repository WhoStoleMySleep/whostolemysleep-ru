import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { count, sql } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:     ['Админка: дашборд'],
    summary:  'Числа для дашборда',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Счётчики постов и длина очереди ревалидации', content: { 'application/json': { schema: { type: 'object', properties: { posts: { type: 'object', properties: { total: { type: 'integer' }, published: { type: 'integer' }, drafts: { type: 'integer' } } }, pending: { type: 'integer' } } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

/**
 * Числа для дашборда. Отдельный эндпоинт, потому что раньше дашборд ради
 * трёх цифр выкачивал все посты со всеми текстами и считал их на клиенте.
 */
export default defineEventHandler(async () => {
  const [posts] = await db
    .select({
      total:     count(),
      published: sql<number>`count(*) filter (where ${schema.post.is_published})`.mapWith(Number),
    })
    .from(schema.post)

  const [pending] = await db
    .select({ total: count() })
    .from(schema.pendingRevalidation)

  const total     = posts?.total ?? 0
  const published = posts?.published ?? 0

  return {
    posts:   { total, published, drafts: total - published },
    pending: pending?.total ?? 0,
  }
})
