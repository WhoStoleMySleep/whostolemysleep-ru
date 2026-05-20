import { db } from '../db'
import { getLocale, pick } from '../utils/locale'

async function fetchAbout(event: any) {
  const locale = getLocale(event)
  const row = await db.query.aboutMe.findFirst()
  if (!row) return null
  return { id: row.id, text: pick(row.text_ru, row.text_en, locale) }
}

export default defineCachedEventHandler(fetchAbout, {
  maxAge:  3600,
  getKey:  (event) => `about-${getQuery(event).locale ?? 'ru'}`,
})
