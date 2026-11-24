import { contentRequestActor } from '~~/server/utils/contentRequest'
import { listContentPlans } from '~~/server/utils/contentPlans'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'read' })
  return listContentPlans(actor)
})
