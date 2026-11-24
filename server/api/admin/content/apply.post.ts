import { contentRequestActor, contentRequestBody } from '~~/server/utils/contentRequest'
import { contentPlanIdSchema } from '~~/shared/content/schemas'
import { applyContentPlan } from '~~/server/utils/contentApply'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'apply' })
  const { planId } = await contentRequestBody(event, contentPlanIdSchema)
  return applyContentPlan(actor, planId)
})
