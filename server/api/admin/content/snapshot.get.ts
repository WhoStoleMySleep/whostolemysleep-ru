import { assertContentPermission } from '~~/server/utils/contentAuth'
import { contentRequestActor, contentSnapshotQuery } from '~~/server/utils/contentRequest'
import { loadContent } from '~~/server/utils/contentRecords'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'read' })
  const { resource, recordId } = contentSnapshotQuery(event)
  assertContentPermission(actor, resource, 'read')
  return (await loadContent(resource, recordId, actor.environment)).snapshot
})
