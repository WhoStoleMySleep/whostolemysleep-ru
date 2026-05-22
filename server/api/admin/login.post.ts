import {
  checkAdminPassword, signAdminToken,
  isRateLimited, recordFailure, clearFailures,
  getClientIp, ADMIN_COOKIE,
} from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const ip    = getClientIp(event)
  const limit = isRateLimited(ip)

  if (limit.limited) {
    throw createError({ statusCode: 429, message: `Too many attempts. Retry after ${limit.retryAfter}s` })
  }

  const { password } = await readBody<{ password: string }>(event)
  const valid = await checkAdminPassword(password ?? '')

  if (!valid) {
    recordFailure(ip)
    throw createError({ statusCode: 401, message: 'Invalid password' })
  }

  clearFailures(ip)
  const token = await signAdminToken()

  setCookie(event, ADMIN_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   7 * 24 * 3600,
    path:     '/',
  })

  return { ok: true }
})
