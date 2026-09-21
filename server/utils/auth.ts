import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'
import type { H3Event } from 'h3'
import { clearRateLimit, clientIp, hitRateLimit, type RateVerdict } from './rateLimit'

export const ADMIN_COOKIE = 'wms_admin'

const ALG       = 'HS256'
const TTL_S     = 7 * 24 * 3600
const MAX_TRIES = 5
const WINDOW_MS = 15 * 60 * 1000

/** Осталось меньше этого — продлеваем сессию на следующий срок. */
const REFRESH_BELOW_S = TTL_S / 2

function jwtSecret() {
  const s = process.env.ADMIN_JWT_SECRET
  if (!s) throw createError({ statusCode: 500, message: 'ADMIN_JWT_SECRET not set' })
  return new TextEncoder().encode(s)
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TTL_S}s`)
    .sign(jwtSecret())
}

/** Разбирает токен. null — подпись не сошлась, срок вышел или это не админ. */
export async function readAdminToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret())
    return payload.admin === true ? payload : null
  } catch {
    return null
  }
}

/**
 * Единственное место, где описаны свойства куки: раньше их держали
 * и логин, и продление, и рассинхрон означал бы молча протухающую сессию.
 *
 * sameSite: 'lax', а не 'strict'. При strict браузер не отдаёт куку,
 * когда на /admin приходят по ссылке с другого сайта, — админка
 * встречала формой входа, хотя сессия была жива. На кросс-сайтовые
 * POST/PATCH/DELETE lax куку тоже не отправляет, так что защита от
 * CSRF остаётся; отличается только переход по обычной ссылке.
 */
export function setAdminCookie(event: H3Event, token: string): void {
  setCookie(event, ADMIN_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   TTL_S,
    path:     '/',
  })
}

/**
 * Скользящая сессия: пока админкой пользуются, срок сдвигается вперёд.
 * Без этого ровно через неделю после входа посреди работы выбрасывало
 * на логин, даже если заходили каждый день.
 */
export async function slideAdminSession(event: H3Event, payload: JWTPayload): Promise<void> {
  const exp = payload.exp
  if (typeof exp !== 'number') return
  if (exp - Math.floor(Date.now() / 1000) > REFRESH_BELOW_S) return

  setAdminCookie(event, await signAdminToken())
}

/**
 * Проверяет, что админка вообще настроена.
 *
 * Без этого отсутствующий ADMIN_PASSWORD_HASH выглядел как неверный
 * пароль: пять попыток «войти» — и 429 на ровном месте, хотя вводили
 * всё правильно. Ошибка настройки должна называться ошибкой настройки.
 */
export function assertAdminConfig(): void {
  const missing = (['ADMIN_JWT_SECRET', 'ADMIN_PASSWORD_HASH'] as const)
    .filter((key) => !process.env[key])

  if (missing.length) {
    throw createError({ statusCode: 500, message: `Not configured: ${missing.join(', ')}` })
  }
}

export async function checkAdminPassword(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, process.env.ADMIN_PASSWORD_HASH!)
}

/** Проверяет и сразу засчитывает попытку входа: состояние общее для всех инстансов. */
export async function hitLoginAttempt(ip: string): Promise<RateVerdict> {
  return hitRateLimit(`login:${ip}`, MAX_TRIES, WINDOW_MS)
}

export async function clearFailures(ip: string): Promise<void> {
  await clearRateLimit(`login:${ip}`)
}

export function getClientIp(event: H3Event): string {
  return clientIp(event)
}
