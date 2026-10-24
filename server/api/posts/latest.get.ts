import { db } from '../../db'
import { eq, sql } from 'drizzle-orm'
import { post } from '../../db/schema'
import { getLocale } from '../../utils/locale'
import { toPostSummary } from '../../utils/publicPost'
import type { H3Event } from 'h3'

/** As many rows as the "Latest" block on the home page shows. */
const LIMIT = 4

/**
 * The newest entries of both types. The home page used to download both full lists
 * and keep four of them, so every published post weighed on its payload.
 */
async function fetchLatest(event: H3Event) {
  const locale = getLocale(event)

  const rows = await db.query.post.findMany({
    where:   eq(post.is_published, true),
    columns: { text_ru: false, text_en: false },
    with: {
      postTags: { with: { tag: true } },
      images:   { orderBy: (img, { asc }) => [asc(img.position)] },
    },
    // Postgres puts nulls first in a descending sort; an undated entry is not news.
    orderBy: (p) => [sql`${p.published_at} desc nulls last`],
    limit:   LIMIT,
  })

  return rows.map((row) => toPostSummary(row, locale))
}

defineRouteMeta({
  openAPI: {
    tags:       ['Public'],
    summary:    'The newest published entries, blog and projects together',
    parameters: [{ $ref: '#/components/parameters/locale' }],
    responses: {
      200: { description: 'Up to four entries, newest first, without the body', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PostSummary' } } } } },
    },
  },
})

export default defineCachedEventHandler(fetchLatest, {
  maxAge: 600,
  getKey: (event) => `posts-latest-${getLocale(event)}`,
})
