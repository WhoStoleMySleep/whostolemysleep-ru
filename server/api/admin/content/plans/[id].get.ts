import { contentRequestActor } from '~~/server/utils/contentRequest'
import { parseContentInput } from '~~/server/utils/contentInput'
import { readContentPlan } from '~~/server/utils/contentPlans'
import { contentPlanIdSchema } from '~~/shared/content/schemas'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'read' })
  const { planId } = parseContentInput(contentPlanIdSchema, { planId: getRouterParam(event, 'id') })
  return readContentPlan(actor, planId)
})
