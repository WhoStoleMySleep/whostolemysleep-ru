import { requirePublishToken } from '~~/server/utils/publishAuth'
import { clientIp, hitRateLimit } from '~~/server/utils/rateLimit'
import { savePublishedPost, type PublishPayload } from '~~/server/utils/publishPost'

/** The token cannot realistically be guessed, but a flood of requests is billed function calls. */
const RATE_LIMIT  = 60
const RATE_WINDOW = 60 * 60 * 1000

defineRouteMeta({
  openAPI: {
    tags:        ['Publisher'],
    summary:     'Update a post',
    description: 'At most 60 requests per address per hour.',
    security:    [{ publishToken: [] }],
    parameters:  [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PublishPayload' } } } },
    responses: {
      200: { description: 'Post updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublishResult' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
      429: { $ref: '#/components/responses/TooManyRequests' },
      503: { description: 'PUBLISH_TOKEN is not set on the server', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
})

export default defineEventHandler(async (event) => {
  const limit = await hitRateLimit(`publish:${clientIp(event)}`, RATE_LIMIT, RATE_WINDOW)
  if (!limit.allowed) {
    throw createError({ statusCode: 429, message: `Too many requests. Retry after ${limit.retryAfter}s` })
  }

  requirePublishToken(event)

  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody<PublishPayload>(event)
  if (!body?.slug || !body?.title || !body?.body_md) {
    throw createError({ statusCode: 400, message: 'Fields slug, title and body_md are required' })
  }

  return savePublishedPost(body, id)
})
