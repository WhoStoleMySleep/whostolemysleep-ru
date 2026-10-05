import { createHash, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * Checks the bearer token of the external publisher (NuxtPublish).
 * One token for the whole integration, and it lives only in the environment.
 */
export function requirePublishToken(event: H3Event): void {
  requireBearer(event, process.env.PUBLISH_TOKEN, 'Publishing is not configured')
}

/**
 * Checks the bearer token of the job-search hub, which only reads the resume.
 * Kept apart from PUBLISH_TOKEN so a leaked read token cannot post anything.
 */
export function requireCvToken(event: H3Event): void {
  requireBearer(event, process.env.CV_TOKEN, 'Resume export is not configured')
}

function requireBearer(event: H3Event, expected: string | undefined, unconfigured: string): void {
  if (!expected) {
    throw createError({ statusCode: 503, message: unconfigured })
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
