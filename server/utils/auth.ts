import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { H3Event } from 'h3'

export const ADMIN_COOKIE = 'wms_admin'

const ALG         = 'HS256'
const TTL         = '7d'
const MAX_TRIES   = 5
const WINDOW_MS   = 15 * 60 * 1000

const attempts = new Map<string, { count: number; since: number }>()

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

export function isRateLimited(ip: string): { limited: boolean; retryAfter?: number } {
  const now   = Date.now()
  const entry = attempts.get(ip)
  if (!entry) return { limited: false }
  if (now - entry.since >= WINDOW_MS) { attempts.delete(ip); return { limited: false } }
  if (entry.count < MAX_TRIES) return { limited: false }
  return { limited: true, retryAfter: Math.ceil((entry.since + WINDOW_MS - now) / 1000) }
}

export function recordFailure(ip: string) {
  const now   = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.since >= WINDOW_MS) {
    attempts.set(ip, { count: 1, since: now })
  } else {
    entry.count++
  }
}

export function clearFailures(ip: string) {
  attempts.delete(ip)
}

export function getClientIp(event: H3Event): string {
  return getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    ?? getRequestHeader(event, 'x-real-ip')
    ?? '0.0.0.0'
}
