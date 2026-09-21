import { db } from '../../db'
import { getLocale, pick } from '../../utils/locale'
import type { H3Event } from 'h3'

async function fetchExperience(event: H3Event) {
  const locale = getLocale(event)

  const rows = await db.query.experience.findMany({
    with: { bullets: { orderBy: (b, { asc }) => [asc(b.order)] } },
    orderBy: (e, { asc }) => [asc(e.order)],
  })

  return rows.map((row) => ({
    id:        row.id,
    company:   row.company,
    position:  pick(row.position_ru, row.position_en, locale),
    date_from: row.date_from,
    date_to:   row.date_to,
    order:     row.order,
    bullets:   row.bullets.map((b) => ({
      id:    b.id,
      text:  pick(b.text_ru, b.text_en, locale),
      order: b.order,
    })),
  }))
}

defineRouteMeta({
  openAPI: {
    tags:       ['Публичные'],
    summary:    'Опыт работы',
    parameters: [{ $ref: '#/components/parameters/locale' }],
    responses: {
      200: { description: 'Места работы в порядке order, внутри — пункты в своём порядке', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Experience' } } } } },
    },
    $global: {
      components: {
        schemas: {
          Experience: {
            type: 'object',
            properties: {
              id:        { type: 'integer' },
              company:   { type: 'string' },
              position:  { type: 'string' },
              date_from: { type: 'string', format: 'date' },
              date_to:   { type: 'string', format: 'date', nullable: true },
              order:     { type: 'integer' },
              bullets:   { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, text: { type: 'string' }, order: { type: 'integer' } } } },
            },
          },
        },
      },
    },
  },
})

export default defineCachedEventHandler(fetchExperience, {
  maxAge:  7200,
  getKey:  (event) => `experience-${getQuery(event).locale ?? 'ru'}`,
})
