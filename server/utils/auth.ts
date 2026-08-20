import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { H3Event } from 'h3'
import { clearRateLimit, clientIp, hitRateLimit, type RateVerdict } from './rateLimit'

export const ADMIN_COOKIE = 'wms_admin'

const ALG       = 'HS256'
const TTL       = '7d'
const MAX_TRIES = 5
const WINDOW_MS = 15 * 60 * 1000

function jwtSecret() {
  const s = process.env.ADMIN_JWT_SECRET
  if (!s) throw createError({ statusCode: 500, message: 'ADMIN_JWT_SECRET not set' })
  return new TextEncoder().encode(s)
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(jwtSecret())
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret())
    return payload.admin === true
  } catch {
    return false
  }
}

export async function checkAdminPassword(plain: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH
  if (!hash) return false
  return bcrypt.compare(plain, hash)
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
