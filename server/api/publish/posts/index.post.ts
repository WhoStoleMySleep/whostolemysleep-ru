import { requirePublishToken } from '~~/server/utils/publishAuth'
import { clientIp, hitRateLimit } from '~~/server/utils/rateLimit'
import { savePublishedPost, type PublishPayload } from '~~/server/utils/publishPost'

/** Токен подобрать нереально, но поток запросов — это оплаченные вызовы функций. */
const RATE_LIMIT  = 60
const RATE_WINDOW = 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const limit = await hitRateLimit(`publish:${clientIp(event)}`, RATE_LIMIT, RATE_WINDOW)
  if (!limit.allowed) {
    throw createError({ statusCode: 429, message: `Too many requests. Retry after ${limit.retryAfter}s` })
  }

  requirePublishToken(event)

  const body = await readBody<PublishPayload>(event)

  if (!body?.slug || !body?.title || !body?.body_md) {
    throw createError({ statusCode: 400, message: 'Fields slug, title and body_md are required' })
  }

  const result = await savePublishedPost(body)
  setResponseStatus(event, 201)
  return result
})
