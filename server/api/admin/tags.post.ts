import { db } from '~~/server/db'
import { tag } from '~~/server/db/schema'
import { slugify } from '~~/server/utils/slug'

const MAX_NAME_LENGTH = 100

function tagFields(body: unknown) {
  const fields = body as { name_ru?: unknown; name_en?: unknown; slug?: unknown } | null
  const name_ru = typeof fields?.name_ru === 'string' ? fields.name_ru.trim() : ''
  const name_en = typeof fields?.name_en === 'string' ? fields.name_en.trim() : ''
  const slug = typeof fields?.slug === 'string' && fields.slug.trim() ? fields.slug.trim() : slugify(name_ru)

  if (!name_ru || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || name_ru.length > MAX_NAME_LENGTH || name_en.length > MAX_NAME_LENGTH || slug.length > MAX_NAME_LENGTH) {
    throw createError({ statusCode: 400, message: 'Tag names must be at most 100 characters; a Russian name producing a non-empty slug is required' })
  }
  return { slug, name_ru, name_en }
}

defineRouteMeta({
  openAPI: {
    tags: ['Admin: posts'],
    summary: 'Create a tag for use on multiple posts',
    security: [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: {
        type: 'object', required: ['name_ru'],
        properties: {
          name_ru: { type: 'string', description: 'Required, 1–100 characters after trimming' },
          name_en: { type: 'string', description: 'Optional, at most 100 characters' },
          slug: { type: 'string', description: 'Optional unique URL slug, lowercase Latin letters, digits and hyphens, at most 100 characters; otherwise generated from name_ru' },
        },
      } } },
    },
    responses: {
      200: { description: 'The created tag; slug defaults to a transliteration of name_ru', content: { 'application/json': { schema: { $ref: '#/components/schemas/TagRow' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      409: { description: 'A tag with this slug already exists' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const fields = tagFields(await readBody<unknown>(event))
  const [created] = await db.insert(tag).values(fields).onConflictDoNothing().returning()
  if (!created) throw createError({ statusCode: 409, message: 'This slug already exists — select the existing tag or enter a different slug' })
  return created
})
