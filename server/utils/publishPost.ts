import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { markdownToHtml, excerptFromHtml } from './markdown'
import { markDirty, postPaths } from './pending'
import { slugify } from './slug'

/** Тело, которое присылает NuxtPublish. */
export interface PublishPayload {
  external_id?:  string
  slug:          string
  title:         string
  lead?:         string | null
  body_md:       string
  cover_url?:    string | null
  tags?:         string[]
  status?:       'published' | 'draft'
  published_at?: string | null
  section?:      string | null
}

export interface PublishResult {
  id:   number
  slug: string
  url:  string
}

/** Раздел сайта: всё, что не помечено проектом, считается статьёй блога. */
function postType(section?: string | null): 'blog' | 'project' {
  return section?.toLowerCase().startsWith('proj') ? 'project' : 'blog'
}

/**
 * Английские поля намеренно остаются пустыми: `pick` на чтении откатывается на русский,
 * а перевод — ручная работа, которую публикатор за автора не сделает.
 */
function fields(payload: PublishPayload) {
  const text = markdownToHtml(payload.body_md)

  return {
    slug:         payload.slug,
    external_id:  payload.external_id ?? null,
    type:         postType(payload.section),
    title_ru:     payload.title,
    text_ru:      text,
    excerpt_ru:   payload.lead?.trim() || excerptFromHtml(text),
    is_published: payload.status !== 'draft',
    published_at: payload.published_at ?? new Date().toISOString(),
    updated_at:   new Date().toISOString(),
  }
}

/** Находит теги по слагам, недостающие заводит — публикатор присылает названия, а не id. */
async function tagIds(names: string[]): Promise<number[]> {
  const wanted = names
    .map((name) => ({ name: name.trim(), slug: slugify(name) }))
    .filter((tag) => tag.slug.length > 0)

  if (!wanted.length) return []

  const slugs = wanted.map((tag) => tag.slug)
  const existing = await db.select().from(schema.tag).where(inArray(schema.tag.slug, slugs))

  const missing = wanted.filter((tag) => !existing.some((row) => row.slug === tag.slug))
  const created = missing.length
    ? await db.insert(schema.tag)
        .values(missing.map((tag) => ({ slug: tag.slug, name_ru: tag.name })))
        .onConflictDoNothing()
        .returning()
    : []

  return [...existing, ...created].map((row) => row.id)
}

async function linkTags(postId: number, names: string[]): Promise<void> {
  const ids = await tagIds(names)

  await db.delete(schema.postTag).where(eq(schema.postTag.post_id, postId))
  if (ids.length) {
    await db.insert(schema.postTag).values(ids.map((tag_id) => ({ post_id: postId, tag_id })))
  }
}

/** Обложка живёт первой картинкой поста; повторная публикация её заменяет. */
async function setCover(postId: number, url: string | null | undefined): Promise<void> {
  await db.delete(schema.image)
    .where(and(eq(schema.image.post_id, postId), eq(schema.image.position, 0)))

  if (!url) return

  await db.insert(schema.image).values({ post_id: postId, url, position: 0 })
}

async function findExisting(payload: PublishPayload) {
  if (payload.external_id) {
    const [byExternal] = await db.select().from(schema.post)
      .where(eq(schema.post.external_id, payload.external_id))
      .limit(1)

    if (byExternal) return byExternal
  }

  // По слагу подхватываем только записи без внешнего id — те, что завели руками в админке.
  // Чужой пост с тем же слагом трогать нельзя: это конфликт, а не та же самая статья.
  const [bySlug] = await db.select().from(schema.post)
    .where(and(eq(schema.post.slug, payload.slug), isNull(schema.post.external_id)))
    .limit(1)

  return bySlug
}

function publicUrl(slug: string): string {
  const base = process.env.NUXT_PUBLIC_SITE_URL ?? 'https://whostolemysleep.ru'
  return `${base.replace(/\/$/, '')}/blog/${slug}`
}

/**
 * Сохраняет присланный пост. Повторная отправка того же `external_id` (или слага)
 * обновляет запись — публикатор повторяет запрос при сетевых сбоях.
 */
export async function savePublishedPost(
  payload: PublishPayload,
  targetId?: number,
): Promise<PublishResult> {
  const existing = targetId
    ? (await db.select().from(schema.post).where(eq(schema.post.id, targetId)).limit(1))[0]
    : await findExisting(payload)

  if (targetId && !existing) {
    throw createError({ statusCode: 404, message: 'Post not found' })
  }

  await assertSlugFree(payload.slug, existing?.id)

  const values = fields(payload)

  const [saved] = existing
    ? await db.update(schema.post).set(values).where(eq(schema.post.id, existing.id)).returning()
    : await db.insert(schema.post).values(values).returning()

  if (!saved) throw createError({ statusCode: 500, message: 'Save failed' })

  await linkTags(saved.id, payload.tags ?? [])
  await setCover(saved.id, payload.cover_url)
  await markDirty(postPaths(saved.slug))

  return { id: saved.id, slug: saved.slug, url: publicUrl(saved.slug) }
}

/** Слаг уникален в таблице: понятная ошибка лучше, чем отказ базы по индексу. */
async function assertSlugFree(slug: string, exceptId?: number): Promise<void> {
  const clash = await db.select({ id: schema.post.id }).from(schema.post)
    .where(exceptId ? and(eq(schema.post.slug, slug), ne(schema.post.id, exceptId)) : eq(schema.post.slug, slug))
    .limit(1)

  if (clash.length) {
    throw createError({ statusCode: 409, message: `Slug "${slug}" is already taken` })
  }
}
