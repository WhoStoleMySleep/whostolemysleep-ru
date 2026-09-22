import { db } from '../db'
import { getLocale, pick } from '../utils/locale'
import type { H3Event } from 'h3'

async function fetchSkills(event: H3Event) {
  const locale = getLocale(event)

  const groups = await db.query.skillGroup.findMany({
    with: { skills: { orderBy: (s, { asc }) => [asc(s.order)] } },
    orderBy: (g, { asc }) => [asc(g.order)],
  })

  return groups.map((g) => ({
    id:   g.id,
    slug: g.slug,
    name: pick(g.name_ru, g.name_en, locale),
    skills: g.skills.map((s) => ({ id: s.id, name: s.name, order: s.order })),
  }))
}

defineRouteMeta({
  openAPI: {
    tags:       ['Public'],
    summary:    'Skills by group',
    parameters: [{ $ref: '#/components/parameters/locale' }],
    responses: {
      200: { description: 'Groups in order, each with its skills in their own order', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SkillGroup' } } } } },
    },
    $global: {
      components: {
        schemas: {
          SkillGroup: {
            type: 'object',
            properties: {
              id:     { type: 'integer' },
              slug:   { type: 'string' },
              name:   { type: 'string' },
              skills: { type: 'array', items: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, order: { type: 'integer' } } } },
            },
          },
        },
      },
    },
  },
})

export default defineCachedEventHandler(fetchSkills, {
  maxAge:  7200,
  getKey:  (event) => `skills-${getQuery(event).locale ?? 'ru'}`,
})
