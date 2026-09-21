import {
  assertAdminConfig, checkAdminPassword, signAdminToken, setAdminCookie,
  hitLoginAttempt, clearFailures, getClientIp,
} from '~~/server/utils/auth'

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
