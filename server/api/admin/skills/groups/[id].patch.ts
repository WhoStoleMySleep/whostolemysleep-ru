import { db } from '~~/server/db'
import { skillGroup } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: навыки'],
    summary:     'Изменить группу навыков',
    security:    [{ adminCookie: [] }],
    parameters:  [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { slug: { type: 'string' }, name_ru: { type: 'string' }, name_en: { type: 'string' }, order: { type: 'integer' } } } } } },
    responses: {
      200: { description: 'Обновлённая группа', content: { 'application/json': { schema: { $ref: '#/components/schemas/SkillGroupRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Partial<typeof skillGroup.$inferInsert>>(event)

  const [updated] = await db
    .update(skillGroup)
    .set(body)
    .where(eq(skillGroup.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404 })
  await markDirty(['/ru/resume', '/en/resume'])
  return updated
})
