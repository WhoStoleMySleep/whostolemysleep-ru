import { eq, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'

export interface RateVerdict {
  allowed:     boolean
  retryAfter?: number
}

/**
 * Счётчик обращений с общим для всех инстансов состоянием — он живёт в базе.
 * Одним запросом: заводим окно, увеличиваем счётчик, начинаем новое окно, если старое истекло.
 */
export async function hitRateLimit(key: string, limit: number, windowMs: number): Promise<RateVerdict> {
  const resetAt = new Date(Date.now() + windowMs).toISOString()
  const { count, reset_at } = schema.rateLimit

  const [row] = await db.insert(schema.rateLimit)
    .values({ key, count: 1, reset_at: resetAt })
    .onConflictDoUpdate({
      target: schema.rateLimit.key,
      set: {
        // Истёкшее окно начинается заново, живое — просто считает дальше.
        count:    sql`case when ${reset_at} <= now() then 1 else ${count} + 1 end`,
        reset_at: sql`case when ${reset_at} <= now() then ${resetAt}::timestamp else ${reset_at} end`,
      },
    })
    .returning()

  if (!row || row.count <= limit) return { allowed: true }

  const retryAfter = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000))
  return { allowed: false, retryAfter }
}

/** Сбрасывает счётчик — после удачного входа копить неудачи незачем. */
export async function clearRateLimit(key: string): Promise<void> {
  await db.delete(schema.rateLimit).where(eq(schema.rateLimit.key, key))
}

/** Совместимость с прежним вызовом из формы контактов. */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { allowed } = await hitRateLimit(key, limit, windowMs)
  return allowed
}

/**
 * Адрес клиента для лимитеров. `x-forwarded-for` сознательно не используется:
 * его присылает сам клиент, и подмена обнуляла бы любой счётчик. На Vercel адрес
 * приходит платформенным заголовком, вне её — берём адрес сокета, подделать который нельзя.
 */
export function clientIp(event: H3Event): string {
  const vercel = getRequestHeader(event, 'x-vercel-forwarded-for')
  if (vercel) return vercel.split(',')[0]!.trim()

  const real = getRequestHeader(event, 'x-real-ip')
  if (real) return real.trim()

  return getRequestIP(event) ?? '0.0.0.0'
}
