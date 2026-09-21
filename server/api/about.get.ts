import { db } from '../db'
import { getLocale, pick } from '../utils/locale'
import type { H3Event } from 'h3'

async function fetchAbout(event: H3Event) {
  const locale = getLocale(event)
  const row = await db.query.aboutMe.findFirst()
  if (!row) return null
  return { id: row.id, text: pick(row.text_ru, row.text_en, locale) }
}

defineRouteMeta({
  openAPI: {
    tags:       ['Публичные'],
    summary:    'Блок «Обо мне»',
    parameters: [{ $ref: '#/components/parameters/locale' }],
    responses: {
      200: { description: 'Текст блока; null, если запись ещё не заведена', content: { 'application/json': { schema: { type: 'object', nullable: true, properties: { id: { type: 'integer' }, text: { type: 'string' } } } } } },
    },
  },
})

export default defineCachedEventHandler(fetchAbout, {
  maxAge:  3600,
  getKey:  (event) => `about-${getQuery(event).locale ?? 'ru'}`,
})
