import { ADMIN_COOKIE } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags:     ['Admin: session'],
    summary:  'Log out',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Cookie cleared', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
    },
  },
})

export default defineEventHandler((event) => {
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
  return { ok: true }
})
