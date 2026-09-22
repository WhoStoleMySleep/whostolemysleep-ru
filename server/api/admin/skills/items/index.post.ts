import { db } from '~~/server/db'
import { skill } from '~~/server/db/schema'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: skills'],
    summary:     'Add a skill to a group',
    security:    [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['group_id', 'name'],
            properties: {
              group_id: { type: 'integer' },
              name:     { type: 'string' },
              order:    { type: 'integer' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'The created skill', content: { 'application/json': { schema: { $ref: '#/components/schemas/SkillRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readBody<{ group_id: number; name: string; order: number }>(event)
  const [row] = await db.insert(skill).values(body).returning()
  await markDirty(['/ru/resume', '/en/resume'])
  return row
})
