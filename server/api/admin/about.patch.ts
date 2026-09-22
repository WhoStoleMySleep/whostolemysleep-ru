import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty, resumePaths } from '~~/server/utils/pending'
import { sanitizeHtml } from '~~/server/utils/sanitize'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: resume'],
    summary:     'Edit the About block',
    description: 'HTML is passed through sanitizeHtml. Resume pages are queued for revalidation.',
    security:    [{ adminCookie: [] }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text_ru: { type: 'string' }, text_en: { type: 'string' } } } } } },
    responses: {
      200: { description: 'The updated row', content: { 'application/json': { schema: { $ref: '#/components/schemas/AboutRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
      404: { $ref: '#/components/responses/NotFound' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readBody<{ text_ru?: string; text_en?: string }>(event)

  if (body.text_ru) body.text_ru = sanitizeHtml(body.text_ru)
  if (body.text_en) body.text_en = sanitizeHtml(body.text_en)

  const [updated] = await db.update(schema.aboutMe)
    .set({ ...body, updated_at: new Date().toISOString() })
    .where(eq(schema.aboutMe.id, 1))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'About not found' })

  await markDirty(resumePaths())
  return updated
})
