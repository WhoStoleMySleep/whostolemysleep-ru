import { inArray } from 'drizzle-orm'
import { db } from '../db'
import * as schema from '../db/schema'

const LOCALES = ['ru', 'en'] as const

/** Queues paths before the flush, so a failed or interrupted flush can be retried later. */
export async function markDirty(paths: string[]) {
  if (!paths.length) return
  await db.insert(schema.pendingRevalidation)
    .values(paths.map((path) => ({ path })))
    .onConflictDoNothing()
}

/** The queue is what has not caught up yet. Only what refreshed is removed. */
export async function clearPending(paths: string[]): Promise<void> {
  if (!paths.length) return
  await db.delete(schema.pendingRevalidation)
    .where(inArray(schema.pendingRevalidation.path, paths))
}

/**
 * Paths are queued without a locale — "the blog page", not "its two versions".
 * Real routes on this site always carry a prefix (strategy: prefix), so a path is
 * expanded into both locales right before the flush. Paths that already have a
 * prefix pass through unchanged.
 */
export function withLocales(path: string): string[] {
  if (LOCALES.some((l) => path === `/${l}` || path.startsWith(`/${l}/`))) return [path]
  const rest = path === '/' ? '' : path
  return LOCALES.map((l) => `/${l}${rest}`)
}

/** Pages that list posts go stale along with the post itself: home, blog and projects. */
export function postPaths(slug?: string): string[] {
  const paths = ['/', '/blog', '/projects']
  if (slug) paths.push(`/blog/${slug}`)
  return paths
}

/** /cv is rendered from the same tables as /resume and goes stale together with it. */
export function resumePaths(): string[] {
  return ['/', '/resume', '/cv']
}
