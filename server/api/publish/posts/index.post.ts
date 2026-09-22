import { requirePublishToken } from '~~/server/utils/publishAuth'
import { clientIp, hitRateLimit } from '~~/server/utils/rateLimit'
import { savePublishedPost, type PublishPayload } from '~~/server/utils/publishPost'

/** The token cannot realistically be guessed, but a flood of requests is billed function calls. */
const RATE_LIMIT  = 60
const RATE_WINDOW = 60 * 60 * 1000

defineRouteMeta({
  openAPI: {
    tags:        ['Publisher'],
    summary:     'Create a post',
    description: 'At most 60 requests per address per hour. Markdown arrives in body_md; the site stores rendered HTML.',
    security:    [{ publishToken: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PublishPayload' } } } },
    responses: {
      201: { description: 'Post created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PublishResult' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      429: { $ref: '#/components/responses/TooManyRequests' },
      503: { description: 'PUBLISH_TOKEN is not set on the server', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
    $global: {
      components: {
        schemas: {
          PublishPayload: {
            type: 'object',
            required: ['slug', 'title', 'body_md'],
            properties: {
              external_id:  { type: 'string', nullable: true, description: 'The post id in the publisher: sending it again updates the row instead of duplicating it' },
              slug:         { type: 'string' },
              title:        { type: 'string' },
              lead:         { type: 'string', nullable: true },
              body_md:      { type: 'string', description: 'Markdown' },
              cover_url:    { type: 'string', nullable: true },
              tags:         { type: 'array', items: { type: 'string' } },
              status:       { type: 'string', enum: ['published', 'draft'] },
              published_at: { type: 'string', format: 'date-time', nullable: true },
              section:      { type: 'string', nullable: true, description: 'Starts with proj — a project, otherwise a blog post' },
            },
          },
          PublishResult: {
            type: 'object',
            properties: {
              id:   { type: 'integer' },
              slug: { type: 'string' },
              url:  { type: 'string', format: 'uri' },
            },
          },
        },
      },
    },
  },
})

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
