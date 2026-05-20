import { db } from '../db'
import { getLocale, pick } from '../utils/locale'

export default defineEventHandler(async (event) => {
  const locale = getLocale(event)
  const row = await db.query.aboutMe.findFirst()
  if (!row) return null
  return { id: row.id, text: pick(row.text_ru, row.text_en, locale) }
})
