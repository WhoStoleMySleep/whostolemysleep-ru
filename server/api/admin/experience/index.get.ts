import { db } from '~~/server/db'

defineRouteMeta({
  openAPI: {
    tags:     ['Админка: резюме'],
    summary:  'Опыт работы списком',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Места работы в порядке order, внутри — пункты в своём порядке', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ExperienceRow' } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
    $global: {
      components: {
        schemas: {
          ExperienceRow: {
            type: 'object',
            properties: {
              id:          { type: 'integer' },
              company:     { type: 'string' },
              position_ru: { type: 'string' },
              position_en: { type: 'string' },
              date_from:   { type: 'string', format: 'date' },
              date_to:     { type: 'string', format: 'date', nullable: true },
              order:       { type: 'integer' },
              bullets:     { type: 'array', items: { $ref: '#/components/schemas/BulletRow' } },
            },
          },
          BulletRow: {
            type: 'object',
            properties: {
              id:      { type: 'integer' },
              text_ru: { type: 'string' },
              text_en: { type: 'string' },
              order:   { type: 'integer' },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async () => {
  return db.query.experience.findMany({
    with: { bullets: { orderBy: (b, { asc }) => [asc(b.order)] } },
    orderBy: (e, { asc }) => [asc(e.order)],
  })
})
