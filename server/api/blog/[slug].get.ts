import { db } from '../../db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { post } from '../../db/schema'
import { getLocale } from '../../utils/locale'
import { toPost } from '../../utils/publicPost'
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

  return toPost(row, locale)
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
  getKey:  (event) => `blog-${getRouterParam(event, 'slug')}-${getLocale(event)}`,
})
