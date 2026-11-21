import { db } from '~~/server/db'
import { createHash } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { tag } from '~~/server/db/schema'
import { slugify } from '~~/server/utils/slug'

const MAX_NAME_LENGTH = 100
const COLLISION_SUFFIX_LENGTH = 10
const COLLISION_PREFIX_LENGTH = MAX_NAME_LENGTH - COLLISION_SUFFIX_LENGTH - '-'.length

function tagFields(body: unknown) {
  const fields = body as { name_ru?: unknown; name_en?: unknown; slug?: unknown } | null
  const name_ru = typeof fields?.name_ru === 'string' ? fields.name_ru.trim() : ''
  const name_en = typeof fields?.name_en === 'string' ? fields.name_en.trim() : ''
  const slug = typeof fields?.slug === 'string' && fields.slug.trim()
    ? fields.slug.trim()
    : slugify(name_ru).slice(0, MAX_NAME_LENGTH).replace(/-+$/, '')

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
          slug: { type: 'string', description: 'Optional unique URL slug; generated automatically with collision handling when omitted' },
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

function sameName(a: string, b: string) {
  return a.trim().toLocaleLowerCase('ru') === b.trim().toLocaleLowerCase('ru')
}

async function insertTag(fields: typeof tag.$inferInsert) {
  const [created] = await db.insert(tag).values(fields).onConflictDoNothing().returning()
  if (created) return created
  const existing = await db.query.tag.findFirst({ where: eq(tag.slug, fields.slug) })
  return existing && sameName(existing.name_ru, fields.name_ru) ? existing : null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name_ru?: unknown; name_en?: unknown; slug?: unknown }>(event)
  const fields = tagFields(body)
  const existing = await db.query.tag.findFirst({ where: sql`lower(trim(${tag.name_ru})) = lower(trim(${fields.name_ru}))` })
  if (existing) return existing
  const created = await insertTag(fields)
  if (created) return created
  if (typeof body?.slug === 'string' && body.slug.trim()) {
    throw createError({ statusCode: 409, message: 'This slug already exists' })
  }
  const suffix = createHash('sha256').update(fields.name_ru.toLocaleLowerCase('ru')).digest('hex').slice(0, COLLISION_SUFFIX_LENGTH)
  const unique = await insertTag({ ...fields, slug: `${fields.slug.slice(0, COLLISION_PREFIX_LENGTH)}-${suffix}` })
  if (!unique) throw createError({ statusCode: 409, message: 'Could not create a unique tag — retry' })
  return unique
})
