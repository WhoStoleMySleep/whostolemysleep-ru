import {
  assertAdminConfig, checkAdminPassword, signAdminToken, setAdminCookie,
  hitLoginAttempt, clearFailures, getClientIp,
} from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: session'],
    summary:     'Log in',
    description: 'Five attempts per address, then a pause. The response sets the wms_admin cookie.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } } },
    },
    responses: {
      200: { description: 'Session cookie issued', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      429: { $ref: '#/components/responses/TooManyRequests' },
      503: { description: 'ADMIN_JWT_SECRET or ADMIN_PASSWORD_HASH is not set', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
})

export default defineEventHandler(async (event) => {
  // Before the counter: a server that is not configured should not spend login attempts.
  assertAdminConfig()

  const ip = getClientIp(event)

  // The attempt is counted before the password is checked: otherwise a request
  // abandoned halfway through would never reach the counter.
  const limit = await hitLoginAttempt(ip)
  if (!limit.allowed) {
    throw createError({ statusCode: 429, message: `Too many attempts. Retry after ${limit.retryAfter}s` })
  }

  const { password } = await readBody<{ password: string }>(event)
  const valid = await checkAdminPassword(password ?? '')

  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid password' })
  }

  await clearFailures(ip)
  setAdminCookie(event, await signAdminToken())

  return { ok: true }
})
