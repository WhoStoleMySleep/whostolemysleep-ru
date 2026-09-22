import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Checks the bearer token of the external publisher (NuxtPublish).
 * One token for the whole integration, and it lives only in the environment.
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

/** Compared as hashes: equal length and constant time, so nothing leaks to a guesser. */
function equalTokens(left: string, right: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(left), digest(right))
}
