import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: posts'],
    summary:     'Edit an image caption',
    security:    [{ adminCookie: [] }],
    parameters:  [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { alt_ru: { type: 'string' }, alt_en: { type: 'string' } } } } } },
    responses: {
      200: { description: 'The updated row', content: { 'application/json': { schema: { $ref: '#/components/schemas/ImageRow' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody<{ alt_ru?: string; alt_en?: string }>(event)

  const [updated] = await db
    .update(schema.image)
    .set({ alt_ru: body.alt_ru, alt_en: body.alt_en })
    .where(eq(schema.image.id, id))
    .returning()

  return updated
})
