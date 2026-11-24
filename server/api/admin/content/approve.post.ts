import { contentRequestActor, contentRequestBody } from '~~/server/utils/contentRequest'
import { contentPlanIdSchema } from '~~/shared/content/schemas'
import { approveContentPlan } from '~~/server/utils/contentPlans'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'control' })
  const { planId } = await contentRequestBody(event, contentPlanIdSchema)
  return approveContentPlan(actor, planId)
})
