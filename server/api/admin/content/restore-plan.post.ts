import { contentRequestActor, contentRequestBody } from '~~/server/utils/contentRequest'
import { contentRestoreSchema } from '~~/shared/content/schemas'
import { restoreContentPlan } from '~~/server/utils/contentAdmin'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'plan' })
  const { historyId, expectedVersion } = await contentRequestBody(event, contentRestoreSchema)
  return restoreContentPlan(actor, historyId, expectedVersion)
})
