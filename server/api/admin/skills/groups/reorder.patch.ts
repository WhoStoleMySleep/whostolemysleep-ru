import { skillGroup } from '~~/server/db/schema'
import { applyOrder, readOrderIds } from '~~/server/utils/reorder'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: skills'],
    summary:     'Reorder skill groups',
    description: 'The whole order is set in one request: the position of an id in the array becomes its order value.',
    security:    [{ adminCookie: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReorderInput' } } } },
    responses: {
      200: { description: 'Order saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const ids = readOrderIds(await readBody(event))
  await applyOrder(skillGroup, ids)
  await markDirty(['/ru/resume', '/en/resume'])
  return { ok: true }
})
