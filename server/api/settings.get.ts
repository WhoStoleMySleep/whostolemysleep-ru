import { db } from '../db'
import * as schema from '../db/schema'
import { eq, asc } from 'drizzle-orm'

async function fetchSettings() {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1))

  const earliest = await db
    .select({ date_from: schema.experience.date_from })
    .from(schema.experience)
    .orderBy(asc(schema.experience.date_from))
    .limit(1)

  const startDate = earliest[0]?.date_from
  const years = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 4

  return {
    open_to_work:     row?.open_to_work     ?? true,
    show_search:      row?.show_search      ?? true,
    github_url:       row?.github_url       ?? '',
    telegram_url:     row?.telegram_url     ?? '',
    email:            row?.email            ?? '',
    years_experience: years,
  }
}

export default defineCachedEventHandler(fetchSettings, {
  maxAge: 300,
  getKey: () => 'settings',
})
