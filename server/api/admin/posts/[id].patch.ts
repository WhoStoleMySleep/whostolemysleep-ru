import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty, postPaths } from '~~/server/utils/pending'
import { sanitizeHtml } from '~~/server/utils/sanitize'

interface PatchBody {
  title_ru?:    string;  title_en?:   string
  text_ru?:     string;  text_en?:    string
  excerpt_ru?:  string;  excerpt_en?: string
  slug?:        string;  url?:        string | null
  is_published?: boolean; published_at?: string | null
  tag_ids?:     number[]
}

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') ?? '')
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  const body = await readBody<PatchBody>(event)
  const { tag_ids, ...fields } = body

  if (fields.text_ru) fields.text_ru = sanitizeHtml(fields.text_ru)
  if (fields.text_en) fields.text_en = sanitizeHtml(fields.text_en)

  const [updated] = await db.update(schema.post)
    .set({ ...fields, updated_at: new Date().toISOString() })
    .where(eq(schema.post.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Not found' })

  if (tag_ids !== undefined) {
    await db.delete(schema.postTag).where(eq(schema.postTag.post_id, id))
    if (tag_ids.length) {
      await db.insert(schema.postTag)
        .values(tag_ids.map((tag_id) => ({ post_id: id, tag_id })))
    }
  }

  await markDirty(postPaths(updated.slug))
  return updated
})
