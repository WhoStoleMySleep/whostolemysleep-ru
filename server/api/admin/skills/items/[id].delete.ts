import { db } from '~~/server/db'
import { skill } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:       ['Админка: навыки'],
    summary:    'Удалить навык',
    security:   [{ adminCookie: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'Навык удалён', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(skill).where(eq(skill.id, id))
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
