import { db } from '../../db'
import { eq, and } from 'drizzle-orm'
import { post } from '../../db/schema'
import { getLocale, pick } from '../../utils/locale'
import type { H3Event } from 'h3'

async function fetchPosts(event: H3Event) {
  const type = getRouterParam(event, 'type')
  if (type !== 'blog' && type !== 'project') {
    throw createError({ statusCode: 400, message: `Invalid type: ${type}` })
  }

  const locale = getLocale(event)

  const rows = await db.query.post.findMany({
    where: and(eq(post.type, type), eq(post.is_published, true)),
    with: {
      postTags: { with: { tag: true } },
      images:   { orderBy: (img, { asc }) => [asc(img.position)] },
    },
    orderBy: (p, { desc }) => [desc(p.published_at)],
  })

  return rows.map((row) => ({
    id:           row.id,
    slug:         row.slug,
    type:         row.type,
    title:        pick(row.title_ru, row.title_en, locale),
    text:         pick(row.text_ru, row.text_en, locale),
    excerpt:      pick(row.excerpt_ru, row.excerpt_en, locale),
    url:          row.url,
    published_at: row.published_at,
    updated_at:   row.updated_at,
    tags: row.postTags.map((pt) => ({
      id:   pt.tag.id,
      slug: pt.tag.slug,
      name: pick(pt.tag.name_ru, pt.tag.name_en, locale),
    })),
    images: row.images.map((img) => ({
      id:       img.id,
      url:      img.url,
      alt:      pick(img.alt_ru, img.alt_en, locale),
      position: img.position,
    })),
  }))
}

defineRouteMeta({
  openAPI: {
    tags:    ['Публичные'],
    summary: 'Опубликованные посты по типу',
    parameters: [
      { name: 'type', in: 'path', required: true, description: 'Раздел сайта', schema: { type: 'string', enum: ['blog', 'project'] } },
      { $ref: '#/components/parameters/locale' },
    ],
    responses: {
      200: { description: 'Посты от новых к старым', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Post' } } } } },
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
          Post: {
            type: 'object',
            properties: {
              id:           { type: 'integer' },
              slug:         { type: 'string' },
              type:         { type: 'string', enum: ['blog', 'project'] },
              title:        { type: 'string' },
              text:         { type: 'string', description: 'HTML, пропущенный через sanitizeHtml' },
              excerpt:      { type: 'string' },
              url:          { type: 'string', nullable: true },
              published_at: { type: 'string', format: 'date-time', nullable: true },
              updated_at:   { type: 'string', format: 'date-time' },
              tags:         { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
              images:       { type: 'array', items: { $ref: '#/components/schemas/PostImage' } },
            },
          },
        },
      },
    },
  },
})

export default defineCachedEventHandler(fetchPosts, {
  maxAge:  600,
  getKey:  (event) => `posts-${getRouterParam(event, 'type')}-${getQuery(event).locale ?? 'ru'}`,
})
