import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { post } from '../../db/schema'
import { getLocale } from '../../utils/locale'
import { toPost } from '../../utils/publicPost'
import type { H3Event } from 'h3'

async function fetchProject(event: H3Event) {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Invalid slug' })
  const locale = getLocale(event)
  if (import.meta.dev && process.env.LOCAL_PROJECT_PREVIEW === 'true' && slug === 'preview-personal-site') {
    const { projectPreview } = await import('../../data/projectPreview')
    return projectPreview(locale)
  }
  const row = await db.query.post.findFirst({
    where: and(eq(post.slug, slug), eq(post.type, 'project'), eq(post.is_published, true)),
    with: {
      postTags: { with: { tag: true } },
      images: { orderBy: (img, { asc }) => [asc(img.position)] },
    },
  })
  if (!row) throw createError({ statusCode: 404, message: 'Project not found' })
  return toPost(row, locale)
}

defineRouteMeta({
  openAPI: {
    tags: ['Public'],
    summary: 'A published project by slug',
    parameters: [
      { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      { $ref: '#/components/parameters/locale' },
    ],
    responses: {
      200: { description: 'A project', content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineEventHandler(fetchProject)
