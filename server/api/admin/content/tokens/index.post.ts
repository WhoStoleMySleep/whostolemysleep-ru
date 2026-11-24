import { contentRequestActor, contentRequestBody } from '~~/server/utils/contentRequest'
import { contentTokenSchema } from '~~/shared/content/schemas'
import { issueContentToken } from '~~/server/utils/contentAdmin'

export default defineEventHandler(async (event) => {
  const actor = await contentRequestActor(event, { admin: true, action: 'control' })
  return issueContentToken(actor, await contentRequestBody(event, contentTokenSchema))
})
