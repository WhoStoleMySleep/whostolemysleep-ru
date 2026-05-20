import { verifyAdminToken, ADMIN_COOKIE } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin') || path === '/api/admin/login') return

  const token = getCookie(event, ADMIN_COOKIE)
  if (!token) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const valid = await verifyAdminToken(token)
  if (!valid) throw createError({ statusCode: 401, message: 'Invalid token' })
})
