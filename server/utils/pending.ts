import { inArray } from 'drizzle-orm'
import { db } from '../db'
import * as schema from '../db/schema'

const LOCALES = ['ru', 'en'] as const

export async function markDirty(paths: string[]) {
  if (!paths.length) return
  await db.insert(schema.pendingRevalidation)
    .values(paths.map((path) => ({ path })))
    .onConflictDoNothing()
}

/** Очередь — это то, что ещё не разъехалось. Снимаем только обновлённое. */
export async function clearPending(paths: string[]): Promise<void> {
  if (!paths.length) return
  await db.delete(schema.pendingRevalidation)
    .where(inArray(schema.pendingRevalidation.path, paths))
}

/**
 * В очередь пути кладутся без локали — «страница блога», а не «две её
 * версии». Реальные маршруты у сайта всегда с префиксом (strategy: prefix),
 * поэтому перед сбросом кеша путь раскрывается в обе локали. Пути, где
 * префикс уже есть, проходят как есть.
 */
export function withLocales(path: string): string[] {
  if (LOCALES.some((l) => path === `/${l}` || path.startsWith(`/${l}/`))) return [path]
  const rest = path === '/' ? '' : path
  return LOCALES.map((l) => `/${l}${rest}`)
}

export function postPaths(slug?: string): string[] {
  const paths = ['/', '/blog', '/projects']
  if (slug) paths.push(`/blog/${slug}`)
  return paths
}

/** /cv рисуется из тех же таблиц, что и /resume, и устаревает вместе с ним. */
export function resumePaths(): string[] {
  return ['/', '/resume', '/cv']
}
