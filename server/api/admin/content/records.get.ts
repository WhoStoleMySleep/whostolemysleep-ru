import { assertContentPermission } from '~~/server/utils/contentAuth'
import { contentRequestActor, contentResourceQuery } from '~~/server/utils/contentRequest'
import { listContentRecords } from '~~/server/utils/contentRecords'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'read' })
  const resource = contentResourceQuery(event)
  assertContentPermission(actor, resource, 'read')
  return listContentRecords(resource)
})
