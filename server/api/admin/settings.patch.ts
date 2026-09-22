import { db } from '~~/server/db'
import { settings } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { markDirty } from '~~/server/utils/pending'

const ALLOWED = ['open_to_work', 'show_search', 'github_url', 'telegram_url', 'email'] as const

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: settings'],
    summary:     'Edit site settings',
    description: 'Only the listed fields are read from the body, everything else is ignored.',
    security:    [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              open_to_work: { type: 'boolean' },
              show_search:  { type: 'boolean' },
              github_url:   { type: 'string' },
              telegram_url: { type: 'string' },
              email:        { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'The updated row', content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const key of ALLOWED) {
    if (key in body) patch[key] = body[key]
  }

  const [updated] = await db
    .update(settings)
    .set(patch)
    .where(eq(settings.id, 1))
    .returning()

  await markDirty(['/ru', '/en', '/ru/contacts', '/en/contacts'])
  return updated
})
