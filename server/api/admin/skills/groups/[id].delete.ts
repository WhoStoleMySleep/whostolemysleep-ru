import { db } from '~~/server/db'
import { skillGroup } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:       ['Админка: навыки'],
    summary:    'Удалить группу навыков',
    security:   [{ adminCookie: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'Группа удалена вместе с навыками', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(skillGroup).where(eq(skillGroup.id, id))
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
