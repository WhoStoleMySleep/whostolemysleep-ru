import { db } from '../../db'
import { getLocale, pick } from '../../utils/locale'

export default defineEventHandler(async (event) => {
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
})
