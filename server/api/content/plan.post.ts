import { contentRequestActor, contentRequestBody } from '~~/server/utils/contentRequest'
import { contentPlanSchema } from '~~/shared/content/schemas'
import { createContentPlan } from '~~/server/utils/contentPlans'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: false, action: 'plan' })
  return createContentPlan(actor, await contentRequestBody(event, contentPlanSchema))
})
