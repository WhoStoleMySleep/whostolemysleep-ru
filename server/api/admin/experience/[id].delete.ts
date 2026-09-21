import { db } from '~~/server/db'
import { experience } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:       ['Админка: резюме'],
    summary:    'Удалить место работы',
    security:   [{ adminCookie: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'Запись удалена', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(experience).where(eq(experience.id, id))
  await markDirty(['/ru', '/en', '/ru/resume', '/en/resume'])
  return { ok: true }
})
