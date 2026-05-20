import { db } from '../db'
import * as schema from '../db/schema'

export async function markDirty(paths: string[]) {
  if (!paths.length) return
  await db.insert(schema.pendingRevalidation)
    .values(paths.map((path) => ({ path })))
    .onConflictDoNothing()
}

export function postPaths(slug?: string): string[] {
  const paths = ['/', '/blog', '/projects']
  if (slug) paths.push(`/blog/${slug}`)
  return paths
}

export function resumePaths(): string[] {
  return ['/', '/resume']
}
