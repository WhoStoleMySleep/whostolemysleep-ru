import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty, postPaths } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:       ['Админка: посты'],
    summary:    'Удалить пост',
    security:   [{ adminCookie: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'Пост удалён', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const [deleted] = await db.delete(schema.post)
    .where(eq(schema.post.id, id))
    .returning()

  if (!deleted) throw createError({ statusCode: 404, message: 'Not found' })

  await markDirty(postPaths(deleted.slug))
  return { ok: true }
})
