import {
  assertAdminConfig, checkAdminPassword, signAdminToken, setAdminCookie,
  hitLoginAttempt, clearFailures, getClientIp,
} from '~~/server/utils/auth'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: сессия'],
    summary:     'Вход',
    description: 'Пять попыток с адреса, дальше пауза. В ответе ставится кука wms_admin.',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } } },
    },
    responses: {
      200: { description: 'Кука сессии выдана', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ok' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      429: { $ref: '#/components/responses/TooManyRequests' },
      503: { description: 'ADMIN_JWT_SECRET или ADMIN_PASSWORD_HASH не заданы', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
})

export default defineEventHandler(async (event) => {
  // До счётчика: ненастроенный сервер не должен тратить попытки входа.
  assertAdminConfig()

  const ip = getClientIp(event)

  // Попытку засчитываем до проверки пароля: иначе неудачные запросы,
  // оборванные на полпути, не попадали бы в счётчик.
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
