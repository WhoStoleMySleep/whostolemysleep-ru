import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { markDirty, postPaths } from '~~/server/utils/pending'
import { sanitizeHtml } from '~~/server/utils/sanitize'

interface CreateBody {
  slug:        string
  type:        'blog' | 'project'
  title_ru:    string
  title_en:    string
  text_ru:     string
  text_en:     string
  excerpt_ru:  string
  excerpt_en:  string
  url:         string | null
  is_published: boolean
  published_at: string | null
  tag_ids:     number[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateBody>(event)
  const { tag_ids, ...fields } = body

  fields.text_ru = sanitizeHtml(fields.text_ru)
  fields.text_en = sanitizeHtml(fields.text_en)

  const [created] = await db.insert(schema.post).values(fields).returning()
  if (!created) throw createError({ statusCode: 500, message: 'Insert failed' })

  if (tag_ids?.length) {
    await db.insert(schema.postTag)
      .values(tag_ids.map((tag_id) => ({ post_id: created.id, tag_id })))
  }

  await markDirty(postPaths(created.slug))
  return created
})
