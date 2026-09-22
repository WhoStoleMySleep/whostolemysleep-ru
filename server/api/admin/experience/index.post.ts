import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { markDirty } from '~~/server/utils/pending'

interface Bullet { text_ru: string; text_en: string }
interface Body {
  company: string
  position_ru: string
  position_en: string
  date_from: string
  date_to?: string | null
  order: number
  bullets: Bullet[]
}

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: resume'],
    summary:     'Add a job',
    description: 'Bullet order follows the order of the bullets array.',
    security:    [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['company', 'position_ru', 'date_from'],
            properties: {
              company:     { type: 'string' },
              position_ru: { type: 'string' },
              position_en: { type: 'string' },
              date_from:   { type: 'string', format: 'date' },
              date_to:     { type: 'string', format: 'date', nullable: true },
              order:       { type: 'integer' },
              bullets:     { type: 'array', items: { type: 'object', properties: { text_ru: { type: 'string' }, text_en: { type: 'string' } } } },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'The created row, without bullets', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExperienceRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)

  const [exp] = await db.insert(schema.experience).values({
    company:     body.company,
    position_ru: body.position_ru,
    position_en: body.position_en,
    date_from:   body.date_from,
    date_to:     body.date_to ?? null,
    order:       body.order ?? 0,
  }).returning()

  if (body.bullets?.length) {
    await db.insert(schema.experienceBullet).values(
      body.bullets.map((b, i) => ({
        experience_id: exp!.id,
        text_ru:       b.text_ru,
        text_en:       b.text_en,
        order:         i,
      }))
    )
  }

  await markDirty(['/ru', '/en', '/ru/resume', '/en/resume'])
  return exp
})
