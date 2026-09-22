import { db } from '../../db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { post } from '../../db/schema'
import { getLocale, pick } from '../../utils/locale'
import type { H3Event } from 'h3'

/**
 * What this route is allowed to serve. A blog post, and a project that has no
 * external url: its card links to /blog/{slug} because there is nowhere else to
 * send it, and filtering on the type alone answered those links with a 404. A
 * project that does point at its own site stays out — that page is over there.
 */
const servedHere = or(eq(post.type, 'blog'), isNull(post.url), eq(post.url, ''))

async function fetchPost(event: H3Event) {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Invalid slug' })

  const locale = getLocale(event)

  const row = await db.query.post.findFirst({
    where: and(eq(post.slug, slug), eq(post.is_published, true), servedHere),
    with: {
      postTags: { with: { tag: true } },
      images:   { orderBy: (img, { asc }) => [asc(img.position)] },
    },
  })

  if (!row) throw createError({ statusCode: 404, message: 'Post not found' })

  return {
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
  }
}

defineRouteMeta({
  openAPI: {
    tags:    ['Public'],
    summary: 'A post by slug — a blog entry, or a project without an external url',
    parameters: [
      { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      { $ref: '#/components/parameters/locale' },
    ],
    responses: {
      200: { description: 'A post', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineCachedEventHandler(fetchPost, {
  maxAge:  600,
  getKey:  (event) => `blog-${getRouterParam(event, 'slug')}-${getQuery(event).locale ?? 'ru'}`,
})
