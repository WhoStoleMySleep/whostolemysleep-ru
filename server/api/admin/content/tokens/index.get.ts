import { contentRequestActor } from '~~/server/utils/contentRequest'
import { listContentTokens } from '~~/server/utils/contentAdmin'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'read' })
  return listContentTokens(actor)
})
