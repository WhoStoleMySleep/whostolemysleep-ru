import { db } from '../../db'
import { and, eq, sql } from 'drizzle-orm'
import { post } from '../../db/schema'
import { getLocale } from '../../utils/locale'
import { toPostSummary } from '../../utils/publicPost'
import type { H3Event } from 'h3'

const LIMIT = 8

/**
 * Only explicitly selected projects belong on the home page; drafts stay private.
 */
async function fetchSelected(event: H3Event) {
  const locale = getLocale(event)

  const rows = await db.query.post.findMany({
    where:   and(eq(post.is_published, true), eq(post.is_pinned, true), eq(post.type, 'project')),
    columns: { text_ru: false, text_en: false },
    with: {
      postTags: { with: { tag: true } },
      images:   { orderBy: (img, { asc }) => [asc(img.position)] },
    },
    // PostgreSQL otherwise puts undated projects ahead of dated ones.
    orderBy: (p) => [sql`${p.published_at} desc nulls last`, sql`${p.id} desc`],
    limit:   LIMIT,
  })

  return rows.map((row) => toPostSummary(row, locale))
}

defineRouteMeta({
  openAPI: {
    tags:       ['Public'],
    summary:    'Selected work: pinned published projects',
    parameters: [{ $ref: '#/components/parameters/locale' }],
    responses: {
      200: { description: 'Up to eight pinned projects, newest first, without the body', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PostSummary' } } } } },
    },
  },
})

export default defineCachedEventHandler(fetchSelected, {
  maxAge: 600,
  getKey: (event) => `posts-selected-${getLocale(event)}`,
})
