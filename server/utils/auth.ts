import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import bcrypt from 'bcryptjs'
import type { H3Event } from 'h3'
import { clearRateLimit, clientIp, hitRateLimit, type RateVerdict } from './rateLimit'

export const ADMIN_COOKIE = 'wms_admin'

const ALG       = 'HS256'
const TTL_S     = 7 * 24 * 3600
const MAX_TRIES = 5
const WINDOW_MS = 15 * 60 * 1000

/** Less than this left — the session is extended by another full term. */
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

/** Parses the token. null means a bad signature, an expired token, or not an admin. */
export async function readAdminToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret())
    return payload.admin === true ? payload : null
  } catch {
    return null
  }
}

/**
 * The only place the cookie's properties are described: login and renewal each
 * used to hold their own copy, and any drift between them would have meant a
 * session that quietly expired.
 *
 * sameSite: 'lax', not 'strict'. With strict the browser withholds the cookie
 * when /admin is opened from a link on another site, so the panel showed the
 * login form despite a live session. lax also withholds it on cross-site
 * POST/PATCH/DELETE, so the CSRF protection is unchanged; only plain
 * navigation behaves differently.
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
 * Sliding session: while the panel is in use, the expiry keeps moving forward.
 * Without it, exactly one week after logging in the session dropped mid-edit,
 * even for someone who used the panel every day.
 */
export async function slideAdminSession(event: H3Event, payload: JWTPayload): Promise<void> {
  const exp = payload.exp
  if (typeof exp !== 'number') return
  if (exp - Math.floor(Date.now() / 1000) > REFRESH_BELOW_S) return

  setAdminCookie(event, await signAdminToken())
}

/**
 * Checks that the admin panel is configured at all.
 *
 * Without this, a missing ADMIN_PASSWORD_HASH looked like a wrong password:
 * five "attempts" and then a 429 out of nowhere, with the right password typed
 * every time. A configuration error should say it is a configuration error.
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

/** Checks and counts a login attempt in one go; the state is shared by every instance. */
export async function hitLoginAttempt(ip: string): Promise<RateVerdict> {
  return hitRateLimit(`login:${ip}`, MAX_TRIES, WINDOW_MS)
}

export async function clearFailures(ip: string): Promise<void> {
  await clearRateLimit(`login:${ip}`)
}

export function getClientIp(event: H3Event): string {
  return clientIp(event)
}
