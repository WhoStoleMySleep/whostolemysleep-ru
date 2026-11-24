import { contentRequestActor, contentSnapshotQuery } from '~~/server/utils/contentRequest'
import { listContentHistory } from '~~/server/utils/contentAdmin'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'read' })
  const { resource, recordId } = contentSnapshotQuery(event)
  return listContentHistory(actor, resource, recordId)
})
