import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq, count } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: посты'],
    summary:     'Прикрепить картинку к посту',
    description: 'Позиция считается сама — картинка встаёт в конец списка.',
    security:    [{ adminCookie: [] }],
    parameters:  [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['url'], properties: { url: { type: 'string', format: 'uri' }, alt_ru: { type: 'string' }, alt_en: { type: 'string' } } } } },
    },
    responses: {
      200: { description: 'Созданная запись картинки', content: { 'application/json': { schema: { $ref: '#/components/schemas/ImageRow' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const postId = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(postId)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody<{ url: string; alt_ru?: string; alt_en?: string }>(event)
  if (!body.url) throw createError({ statusCode: 400, message: 'url required' })

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(schema.image)
    .where(eq(schema.image.post_id, postId))

  const [created] = await db.insert(schema.image).values({
    post_id:  postId,
    url:      body.url,
    alt_ru:   body.alt_ru ?? '',
    alt_en:   body.alt_en ?? '',
    position: total,
  }).returning()

  return created
})
