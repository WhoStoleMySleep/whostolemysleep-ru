import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { asc } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:     ['Админка: посты'],
    summary:  'Все теги',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Теги по алфавиту русского названия', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TagRow' } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
    $global: {
      components: {
        schemas: {
          TagRow: {
            type: 'object',
            properties: {
              id:      { type: 'integer' },
              slug:    { type: 'string' },
              name_ru: { type: 'string' },
              name_en: { type: 'string' },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async () => {
  return db.select().from(schema.tag).orderBy(asc(schema.tag.name_ru))
})
