import { db } from '~~/server/db'
import { skillGroup } from '~~/server/db/schema'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: skills'],
    summary:     'Create a skill group',
    security:    [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['slug', 'name_ru'],
            properties: {
              slug:    { type: 'string' },
              name_ru: { type: 'string' },
              name_en: { type: 'string' },
              order:   { type: 'integer' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'The created group', content: { 'application/json': { schema: { $ref: '#/components/schemas/SkillGroupRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readBody<{ slug: string; name_ru: string; name_en: string; order: number }>(event)
  const [group] = await db.insert(skillGroup).values(body).returning()
  await markDirty(['/ru/resume', '/en/resume'])
  return group
})
