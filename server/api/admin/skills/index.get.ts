import { db } from '~~/server/db'

defineRouteMeta({
  openAPI: {
    tags:     ['Admin: skills'],
    summary:  'Skill groups with their skills',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Groups in order, each with its skills in their own order', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SkillGroupRow' } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
    $global: {
      components: {
        schemas: {
          SkillGroupRow: {
            type: 'object',
            properties: {
              id:      { type: 'integer' },
              slug:    { type: 'string' },
              name_ru: { type: 'string' },
              name_en: { type: 'string' },
              order:   { type: 'integer' },
              skills:  { type: 'array', items: { $ref: '#/components/schemas/SkillRow' } },
            },
          },
          SkillRow: {
            type: 'object',
            properties: {
              id:       { type: 'integer' },
              group_id: { type: 'integer' },
              name:     { type: 'string' },
              order:    { type: 'integer' },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async () => {
  return db.query.skillGroup.findMany({
    with: { skills: { orderBy: (s, { asc }) => [asc(s.order)] } },
    orderBy: (g, { asc }) => [asc(g.order)],
  })
})
