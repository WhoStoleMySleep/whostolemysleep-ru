import { contentRequestActor, contentRequestBody } from '~~/server/utils/contentRequest'
import { contentProjectSchema } from '~~/shared/content/schemas'
import { createProjectPlan } from '~~/server/utils/contentProject'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: false, action: 'plan' })
  return createProjectPlan(actor, await contentRequestBody(event, contentProjectSchema))
})
