import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:     ['Админка: резюме'],
    summary:  'Блок «Обо мне» на обоих языках',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Запись целиком', content: { 'application/json': { schema: { $ref: '#/components/schemas/AboutRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
    $global: {
      components: {
        schemas: {
          AboutRow: {
            type: 'object',
            properties: {
              id:         { type: 'integer' },
              text_ru:    { type: 'string' },
              text_en:    { type: 'string' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async () => {
  const row = await db.query.aboutMe.findFirst({ where: eq(schema.aboutMe.id, 1) })
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
