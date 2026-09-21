import { db } from '~~/server/db'
import { education } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:       ['Админка: резюме'],
    summary:    'Удалить образование',
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
  await db.delete(education).where(eq(education.id, id))
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
