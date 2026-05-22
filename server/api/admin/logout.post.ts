import { ADMIN_COOKIE } from '~~/server/utils/auth'

export default defineEventHandler((event) => {
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
  return { ok: true }
})
