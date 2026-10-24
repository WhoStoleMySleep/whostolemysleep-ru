import { db } from '../../db'
import { eq, and } from 'drizzle-orm'
import { post } from '../../db/schema'
import { getLocale } from '../../utils/locale'
import { toPostSummary } from '../../utils/publicPost'
import type { H3Event } from 'h3'

async function fetchPosts(event: H3Event) {
  const type = getRouterParam(event, 'type')
  if (type !== 'blog' && type !== 'project') {
    throw createError({ statusCode: 400, message: `Invalid type: ${type}` })
  }

  const locale = getLocale(event)

  const rows = await db.query.post.findMany({
    where:   and(eq(post.type, type), eq(post.is_published, true)),
    columns: { text_ru: false, text_en: false },
    with: {
      postTags: { with: { tag: true } },
      images:   { orderBy: (img, { asc }) => [asc(img.position)] },
    },
    orderBy: (p, { desc }) => [desc(p.published_at)],
  })

  return rows.map((row) => toPostSummary(row, locale))
}

defineRouteMeta({
  openAPI: {
    tags:    ['Public'],
    summary: 'Published posts by type',
    parameters: [
      { name: 'type', in: 'path', required: true, description: 'A section of the site', schema: { type: 'string', enum: ['blog', 'project'] } },
      { $ref: '#/components/parameters/locale' },
    ],
    responses: {
      200: { description: 'Posts, newest first, without the body', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PostSummary' } } } } },
      400: { $ref: '#/components/responses/BadRequest' },
    },
    $global: {
      components: {
        schemas: {
          Tag: {
            type: 'object',
            properties: {
              id:   { type: 'integer' },
              slug: { type: 'string' },
              name: { type: 'string' },
            },
          },
          PostImage: {
            type: 'object',
            properties: {
              id:       { type: 'integer' },
              url:      { type: 'string', format: 'uri' },
              alt:      { type: 'string' },
              position: { type: 'integer' },
            },
          },
          PostSummary: {
            type: 'object',
            properties: {
              id:           { type: 'integer' },
              slug:         { type: 'string' },
              type:         { type: 'string', enum: ['blog', 'project'] },
              title:        { type: 'string' },
              excerpt:      { type: 'string' },
              url:          { type: 'string', nullable: true },
              published_at: { type: 'string', format: 'date-time', nullable: true },
              updated_at:   { type: 'string', format: 'date-time' },
              tags:         { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
              images:       { type: 'array', items: { $ref: '#/components/schemas/PostImage' } },
            },
          },
          Post: {
            type: 'object',
            allOf: [
              { $ref: '#/components/schemas/PostSummary' },
              { type: 'object', properties: { text: { type: 'string', description: 'HTML, passed through sanitizeHtml' } } },
            ],
          },
        },
      },
    },
  },
})

export default defineCachedEventHandler(fetchPosts, {
  maxAge:  600,
  getKey:  (event) => `posts-${getRouterParam(event, 'type')}-${getLocale(event)}`,
})
