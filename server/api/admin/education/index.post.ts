import { db } from '~~/server/db'
import { education } from '~~/server/db/schema'
import { markDirty } from '~~/server/utils/pending'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: резюме'],
    summary:     'Добавить образование',
    security:    [{ adminCookie: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['institution', 'specialization_ru', 'date_from'],
            properties: {
              institution:       { type: 'string' },
              specialization_ru: { type: 'string' },
              specialization_en: { type: 'string' },
              date_from:         { type: 'string', format: 'date' },
              date_to:           { type: 'string', format: 'date', nullable: true },
              order:             { type: 'integer' },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Созданная запись', content: { 'application/json': { schema: { $ref: '#/components/schemas/EducationRow' } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    institution: string
    specialization_ru: string
    specialization_en: string
    date_from: string
    date_to?: string | null
    order: number
  }>(event)

  const [row] = await db.insert(education).values({
    institution:       body.institution,
    specialization_ru: body.specialization_ru,
    specialization_en: body.specialization_en,
    date_from:         body.date_from,
    date_to:           body.date_to ?? null,
    order:             body.order ?? 0,
  }).returning()

  await markDirty(['/ru/resume', '/en/resume'])
  return row
})
