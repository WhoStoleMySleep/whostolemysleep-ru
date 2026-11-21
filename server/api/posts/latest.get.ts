import { db } from '../../db'
import { and, eq } from 'drizzle-orm'
import { post } from '../../db/schema'
import { getLocale } from '../../utils/locale'
import { toPostSummary } from '../../utils/publicPost'
import { postListOrder } from '../../utils/postOrder'
import type { H3Event } from 'h3'

const LIMIT = 8

/**
 * Закреплённые проекты задают начало подборки; свободные места заполняются свежими.
 */
async function fetchSelected(event: H3Event) {
  const locale = getLocale(event)

  const rows = await db.query.post.findMany({
    where:   and(eq(post.is_published, true), eq(post.type, 'project')),
    columns: { text_ru: false, text_en: false },
    orderBy: postListOrder,
    limit:   LIMIT,
  })

  return rows.map((row) => toPostSummary({ ...row, postTags: [], images: [] }, locale))
}

defineRouteMeta({
  openAPI: {
    tags:       ['Public'],
    summary:    'Selected work: pinned projects followed by recent projects',
    parameters: [{ $ref: '#/components/parameters/locale' }],
    responses: {
      200: { description: 'Up to eight published projects, pinned in manual order then newest, without the body', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PostSummary' } } } } },
    },
  },
})

export default defineEventHandler(fetchSelected)
