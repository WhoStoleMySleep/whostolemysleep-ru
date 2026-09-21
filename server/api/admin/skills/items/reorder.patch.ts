import { skill } from '~~/server/db/schema'
import { applyOrder, readOrderIds } from '~~/server/utils/reorder'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: навыки'],
    summary:     'Переставить навыки',
    description: 'Порядок задаётся одним запросом: позиция id в массиве становится значением order.',
    security:    [{ adminCookie: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReorderInput' } } } },
    responses: {
      200: { description: 'Порядок сохранён', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const ids = readOrderIds(await readBody(event))
  await applyOrder(skill, ids)
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
