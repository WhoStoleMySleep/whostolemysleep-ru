import { contentRequestActor, contentRequestBody } from '~~/server/utils/contentRequest'
import { contentRevokeSchema } from '~~/shared/content/schemas'
import { revokeContentToken } from '~~/server/utils/contentAdmin'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'control' })
  const { id } = await contentRequestBody(event, contentRevokeSchema)
  return revokeContentToken(actor, id)
})
