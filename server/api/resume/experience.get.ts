import { db } from '../../db'
import { getLocale, pick } from '../../utils/locale'

export default defineEventHandler(async (event) => {
  const locale = getLocale(event)

  const rows = await db.query.experience.findMany({
    with: {
      bullets: { orderBy: (b, { asc }) => [asc(b.order)] },
    },
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
})
