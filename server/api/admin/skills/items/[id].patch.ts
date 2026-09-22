import { db } from '~~/server/db'
import { skill } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: skills'],
    summary:     'Edit a skill',
    security:    [{ adminCookie: [] }],
    parameters:  [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { group_id: { type: 'integer' }, name: { type: 'string' }, order: { type: 'integer' } } } } } },
    responses: {
      200: { description: 'The updated skill', content: { 'application/json': { schema: { $ref: '#/components/schemas/SkillRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Partial<typeof skill.$inferInsert>>(event)

  const [updated] = await db
    .update(skill)
    .set(body)
    .where(eq(skill.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404 })
  await markDirty(['/ru/resume', '/en/resume'])
  return updated
})
