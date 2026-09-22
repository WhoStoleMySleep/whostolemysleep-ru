import { eq, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'

export interface RateVerdict {
  allowed:     boolean
  retryAfter?: number
}

/**
 * A request counter whose state is shared by every instance, which is why it lives
 * in the database. One statement: open the window, increment it, and start a new
 * window when the old one has expired.
 */
export async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<RateVerdict> {
  const resetAt = new Date(Date.now() + windowMs).toISOString()
  const { count, reset_at } = schema.rateLimit

  const [row] = await db.insert(schema.rateLimit)
    .values({ key, count: 1, reset_at: resetAt })
    .onConflictDoUpdate({
      target: schema.rateLimit.key,
      set: {
        // An expired window starts over; a live one just keeps counting.
        count:    sql`case when ${reset_at} <= now() then 1 else ${count} + 1 end`,
        reset_at: sql`case when ${reset_at} <= now() then ${resetAt}::timestamp else ${reset_at} end`,
      },
    })
    .returning()

  if (!row || row.count <= limit) return { allowed: true }

  const retryAfter = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000))
  return { allowed: false, retryAfter }
}

/** Clears the counter — after a successful login there is no point keeping failures. */
export async function clearRateLimit(key: string): Promise<void> {
  await db.delete(schema.rateLimit).where(eq(schema.rateLimit.key, key))
}

/** Kept for the older call site in the contact form. */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { allowed } = await hitRateLimit(key, limit, windowMs)
  return allowed
}

/**
 * The client address used by the limiters. `x-forwarded-for` is deliberately ignored:
 * the client sends it itself, and spoofing it would reset any counter. On Vercel the
 * address arrives in a platform header; elsewhere the socket address is used, and that
 * one cannot be faked.
 */
export function clientIp(event: H3Event): string {
  const vercel = getRequestHeader(event, 'x-vercel-forwarded-for')
  if (vercel) return vercel.split(',')[0]!.trim()

  const real = getRequestHeader(event, 'x-real-ip')
  if (real) return real.trim()

  return getRequestIP(event) ?? '0.0.0.0'
}
