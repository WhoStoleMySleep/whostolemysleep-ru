import { requireCvToken } from '~~/server/utils/publishAuth'
import { clientIp, hitRateLimit } from '~~/server/utils/rateLimit'
import { buildSnapshot } from '~~/server/utils/cv'

/** The hub asks a few times a day; anything far above that is a flood of billed function calls. */
const RATE_LIMIT  = 60
const RATE_WINDOW = 60 * 60 * 1000

defineRouteMeta({
  openAPI: {
    tags:        ['Publisher'],
    summary:     'Read the resume',
    description: 'The same snapshot as the admin export, for the job-search hub. At most 60 requests per address per hour.',
    security:    [{ cvToken: [] }],
    responses: {
      200: { description: 'A resume snapshot', content: { 'application/json': { schema: { $ref: '#/components/schemas/CvSnapshot' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      429: { $ref: '#/components/responses/TooManyRequests' },
      503: { description: 'CV_TOKEN is not set on the server', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
})

/** The hub hashes the answer to spot a new version, so it must never come from a cache. */
export default defineEventHandler(async (event) => {
  const limit = await hitRateLimit(`cv:${clientIp(event)}`, RATE_LIMIT, RATE_WINDOW)
  if (!limit.allowed) {
    throw createError({ statusCode: 429, message: `Too many requests. Retry after ${limit.retryAfter}s` })
  }

  requireCvToken(event)

  setResponseHeader(event, 'cache-control', 'no-store')
  return buildSnapshot()
})
