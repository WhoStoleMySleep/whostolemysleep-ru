import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq, sql } from 'drizzle-orm'
import { markDirty, postPaths } from '~~/server/utils/pending'
import { sanitizeHtml } from '~~/server/utils/sanitize'
import { lockPostOrder } from '~~/server/utils/postOrder'

interface PatchBody {
  title_ru?:    string;  title_en?:   string
  text_ru?:     string;  text_en?:    string
  excerpt_ru?:  string;  excerpt_en?: string
  slug?:        string;  url?:        string | null
  is_pinned?: boolean
  is_published?: boolean; published_at?: string | null
  tag_ids?:     number[]
}

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: posts'],
    summary:     'Edit a post',
    description: 'tag_ids, when given, replaces the whole set of tags.',
    security:    [{ adminCookie: [] }],
    parameters:  [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PostInput' } } } },
    responses: {
      200: { description: 'The updated row', content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminPost' } } } },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

function sanitizedFields(fields: Omit<PatchBody, 'tag_ids'>) {
  const sanitized = { ...fields }
  if (sanitized.text_ru) sanitized.text_ru = sanitizeHtml(sanitized.text_ru)
  if (sanitized.text_en) sanitized.text_en = sanitizeHtml(sanitized.text_en)
  return sanitized
}

async function updatePost(id: number, fields: Omit<PatchBody, 'tag_ids'>) {
  const pinOrder = fields.is_pinned === true
    ? { pin_order: sql`case when ${schema.post.is_pinned} then ${schema.post.pin_order} else coalesce((select max(pin_order) from ${schema.post} where is_pinned), -1) + 1 end` }
    : {}
  const [, previous, rows] = await db.batch([
    lockPostOrder(),
    db.select().from(schema.post).where(eq(schema.post.id, id)).limit(1),
    db.update(schema.post)
      .set({ ...fields, ...pinOrder, updated_at: new Date().toISOString() })
      .where(eq(schema.post.id, id)).returning(),
  ])
  const [updated] = rows
  if (!updated) throw createError({ statusCode: 404, message: 'Not found' })
  return { previous: previous[0], updated }
}

async function replaceTags(id: number, tagIds: number[] | undefined) {
  if (tagIds === undefined) return
  await db.delete(schema.postTag).where(eq(schema.postTag.post_id, id))
  if (!tagIds.length) return
  await db.insert(schema.postTag).values(tagIds.map(tag_id => ({ post_id: id, tag_id })))
}

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const { tag_ids, ...fields } = await readBody<PatchBody>(event)
  const { previous, updated } = await updatePost(id, sanitizedFields(fields))
  await replaceTags(id, tag_ids)
  await markDirty([...postPaths(previous), ...postPaths(updated)])
  return updated
})
