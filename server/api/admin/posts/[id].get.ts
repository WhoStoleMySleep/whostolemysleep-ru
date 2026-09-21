import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:       ['Админка: посты'],
    summary:    'Пост целиком, с тегами и картинками',
    security:   [{ adminCookie: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'Пост', content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminPost' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const row = await db.query.post.findFirst({
    where: eq(schema.post.id, id),
    with: {
      postTags: { with: { tag: true } },
      images:   { orderBy: (img, { asc }) => [asc(img.position)] },
    },
  })

  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
