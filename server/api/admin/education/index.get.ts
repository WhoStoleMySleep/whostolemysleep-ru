import { db } from '~~/server/db'

defineRouteMeta({
  openAPI: {
    tags:     ['Admin: resume'],
    summary:  'Education as a list',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Rows in order', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/EducationRow' } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
    $global: {
      components: {
        schemas: {
          EducationRow: {
            type: 'object',
            properties: {
              id:                { type: 'integer' },
              institution:       { type: 'string' },
              specialization_ru: { type: 'string' },
              specialization_en: { type: 'string' },
              date_from:         { type: 'string', format: 'date' },
              date_to:           { type: 'string', format: 'date', nullable: true },
              order:             { type: 'integer' },
            },
          },
          ReorderInput: {
            type: 'object',
            required: ['ids'],
            properties: { ids: { type: 'array', items: { type: 'integer' }, description: 'The position of an id in the list becomes its order value' } },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async () => {
  return db.query.education.findMany({
    orderBy: (e, { asc }) => [asc(e.order)],
  })
})
