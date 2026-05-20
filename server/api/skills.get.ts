import { db } from '../db'
import { getLocale, pick } from '../utils/locale'

export default defineEventHandler(async (event) => {
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
})
