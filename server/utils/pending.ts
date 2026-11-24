import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '../db'
import * as schema from '../db/schema'
import { revalidatePaths } from './revalidate'

const LOCALES = ['ru', 'en'] as const

type PendingPage = { path: string; revision: string }
type PostPage = Pick<typeof schema.post.$inferSelect, 'slug' | 'type' | 'url'>

/** Сначала сохраняет очередь: сбой обновления страниц не отменяет сохранённый контент. */
export async function markDirty(paths: string[]): Promise<void> {
  const unique = [...new Set(paths)]
  if (!unique.length) return
  await db.insert(schema.pendingRevalidation)
    .values(unique.map(path => ({ path })))
    .onConflictDoUpdate({
      target: schema.pendingRevalidation.path,
      set: { added_at: sql`greatest(clock_timestamp(), ${schema.pendingRevalidation.added_at} + interval '1 microsecond')` },
    })

  try {
    const result = await flushPending(unique)
    if (!result.ok) console.warn('Content saved; some cache refreshes remain queued', result.failed)
  } catch (error) {
    console.error('Content saved; cache refresh remains queued', error)
  }
}

/** Удаляет только обработанную версию: параллельное сохранение должно остаться в очереди. */
export async function clearPending(pages: PendingPage[]): Promise<void> {
  if (!pages.length) return
  await db.delete(schema.pendingRevalidation).where(or(...pages.map(page => and(
    eq(schema.pendingRevalidation.path, page.path),
    sql`${schema.pendingRevalidation.added_at} = ${page.revision}::timestamptz`,
  ))))
}

function detailPath(path: string): string | undefined {
  return /^\/(?:(?:ru|en)\/)?((?:blog|projects)\/[^/]+)$/.exec(path)?.[1]
}

async function missingDetails(paths: string[]): Promise<string[]> {
  const details = paths.map(detailPath).filter((path): path is string => !!path)
  const slugs = [...new Set(details.map(path => path.split('/')[1]!))]
  if (!slugs.length) return []
  const rows = await db.select({ slug: schema.post.slug, type: schema.post.type, url: schema.post.url, is_published: schema.post.is_published })
    .from(schema.post).where(inArray(schema.post.slug, slugs))
  const available = new Set(rows.filter(row => row.is_published).flatMap(detailPaths).map(path => path.slice(1)))
  return paths.filter(path => {
    const detail = detailPath(path)
    return detail !== undefined && !available.has(detail)
  }).flatMap(withLocales)
}

/** Один механизм для автоматического обновления и ручной повторной попытки. */
export async function flushPending(paths?: string[]) {
  if (paths && !paths.length) return { ok: true, cleared: [], failed: [] }
  // Date теряет микросекунды PostgreSQL; текстовая версия сохраняет точность сравнения.
  const pending = await db.select({ path: schema.pendingRevalidation.path, revision: sql<string>`${schema.pendingRevalidation.added_at}::text` })
    .from(schema.pendingRevalidation)
    .where(paths ? inArray(schema.pendingRevalidation.path, paths) : undefined)
  const queued = pending.map(page => page.path)
  const targets = [...new Set(queued.flatMap(withLocales))]
  const { revalidated, failed } = await revalidatePaths(targets, await missingDetails(queued))
  const broken = new Set(failed.map(page => page.path))
  await clearPending(pending.filter(page => !withLocales(page.path).some(path => broken.has(path))))
  return { ok: !failed.length, cleared: revalidated, failed }
}

/** Очередь хранит логические страницы, перед запросом они разворачиваются в обе локали. */
export function withLocales(path: string): string[] {
  if (LOCALES.some(locale => path === `/${locale}` || path.startsWith(`/${locale}/`))) return [path]
  const rest = path === '/' ? '' : path
  return LOCALES.map(locale => `/${locale}${rest}`)
}

function detailPaths(post: PostPage): string[] {
  if (post.type === 'blog') return [`/blog/${post.slug}`]
  // Старые страницы без внешнего URL остаются редиректами и тоже могут быть закешированы.
  return [`/projects/${post.slug}`, ...(post.url ? [] : [`/blog/${post.slug}`])]
}

/** Контент меняет списки, собственную страницу и ранее доступный адрес проекта. */
export function postPaths(post?: PostPage): string[] {
  return ['/', '/blog', '/projects', ...(post ? detailPaths(post) : [])]
}

/** Изображения используются и в карточках, и на странице проекта или статьи. */
export async function markPostDirty(postId: number): Promise<void> {
  const [post] = await db.select({ slug: schema.post.slug, type: schema.post.type, url: schema.post.url })
    .from(schema.post).where(eq(schema.post.id, postId)).limit(1)
  if (post) await markDirty(postPaths(post))
}

/** Настройки используются общим layout, поэтому меняют все публичные страницы. */
export async function sitePaths(): Promise<string[]> {
  const posts = await db.select({ slug: schema.post.slug, type: schema.post.type, url: schema.post.url })
    .from(schema.post).where(eq(schema.post.is_published, true))
  return ['/', '/blog', '/projects', '/resume', '/cv', '/contacts', '/privacy', ...posts.flatMap(detailPaths)]
}

/** Печатное CV использует те же таблицы, что и резюме. */
export function resumePaths(): string[] {
  return ['/', '/resume', '/cv']
}
