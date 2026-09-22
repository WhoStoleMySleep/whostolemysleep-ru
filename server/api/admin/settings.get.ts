import { db } from '~~/server/db'
import { settings } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:     ['Admin: settings'],
    summary:  'The settings row',
    security: [{ adminCookie: [] }],
    responses: {
      200: { description: 'The settings row; null when it does not exist yet', content: { 'application/json': { schema: { $ref: '#/components/schemas/SettingsRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
    $global: {
      components: {
        schemas: {
          SettingsRow: {
            type: 'object',
            nullable: true,
            properties: {
              id:           { type: 'integer' },
              open_to_work: { type: 'boolean' },
              show_search:  { type: 'boolean' },
              github_url:   { type: 'string' },
              telegram_url: { type: 'string' },
              email:        { type: 'string' },
              updated_at:   { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  },
})

export default defineEventHandler(async () => {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  return row ?? null
})
