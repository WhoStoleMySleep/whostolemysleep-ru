import { db } from '~~/server/db'
import { education } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: resume'],
    summary:     'Edit an education entry',
    security:    [{ adminCookie: [] }],
    parameters:  [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EducationRow' } } } },
    responses: {
      200: { description: 'The updated row', content: { 'application/json': { schema: { $ref: '#/components/schemas/EducationRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Partial<typeof education.$inferInsert>>(event)

  const [updated] = await db
    .update(education)
    .set(body)
    .where(eq(education.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404 })

  await markDirty(['/ru/resume', '/en/resume'])
  return updated
})
