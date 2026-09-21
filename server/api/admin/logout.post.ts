import { ADMIN_COOKIE } from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags:     ['Админка: сессия'],
    summary:  'Выход',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'Кука удалена', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
    },
  },
})

export default defineEventHandler((event) => {
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
  return { ok: true }
})
