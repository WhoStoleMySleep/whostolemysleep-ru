import { db } from '../../db'
import { getLocale, pick } from '../../utils/locale'
import type { H3Event } from 'h3'

async function fetchEducation(event: H3Event) {
  const locale = getLocale(event)

  const rows = await db.query.education.findMany({
    orderBy: (e, { asc }) => [asc(e.order)],
  })

  return rows.map((row) => ({
    id:             row.id,
    institution:    row.institution,
    specialization: pick(row.specialization_ru, row.specialization_en, locale),
    date_from:      row.date_from,
    date_to:        row.date_to,
    order:          row.order,
  }))
}

defineRouteMeta({
  openAPI: {
    tags:       ['Публичные'],
    summary:    'Образование',
    parameters: [{ $ref: '#/components/parameters/locale' }],
    responses: {
      200: { description: 'Записи в порядке order', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Education' } } } } },
    },
    $global: {
      components: {
        schemas: {
          Education: {
            type: 'object',
            properties: {
              id:             { type: 'integer' },
              institution:    { type: 'string' },
              specialization: { type: 'string' },
              date_from:      { type: 'string', format: 'date' },
              date_to:        { type: 'string', format: 'date', nullable: true },
              order:          { type: 'integer' },
            },
          },
        },
      },
    },
  },
})

export default defineCachedEventHandler(fetchEducation, {
  maxAge:  7200,
  getKey:  (event) => `education-${getQuery(event).locale ?? 'ru'}`,
})
