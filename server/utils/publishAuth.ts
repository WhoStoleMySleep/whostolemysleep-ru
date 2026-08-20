import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Проверяет Bearer-токен внешнего публикатора (NuxtPublish).
 * Токен один на всю интеграцию и живёт только в переменных окружения.
 */
export function requirePublishToken(event: H3Event): void {
  const expected = process.env.PUBLISH_TOKEN

  if (!expected) {
    throw createError({ statusCode: 503, message: 'Publishing is not configured' })
  }

  const header = getRequestHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''

  if (!token || !equalTokens(token, expected)) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
}

/** Сравнение через хеши: одинаковая длина и постоянное время, без подсказок подбору. */
function equalTokens(left: string, right: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(left), digest(right))
}
