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
    : 5

  return {
    open_to_work:     row?.open_to_work     ?? true,
    show_search:      row?.show_search      ?? true,
    github_url:       row?.github_url       ?? '',
    telegram_url:     row?.telegram_url     ?? '',
    email:            row?.email            ?? '',
    years_experience: years,
  }
}

/** Общие компоненты спецификации объявлены здесь и доступны всем маршрутам через $global. */
defineRouteMeta({
  openAPI: {
    tags:    ['Публичные'],
    summary: 'Настройки сайта',
    responses: {
      200: { description: 'Флаги, ссылки и стаж, посчитанный от самой ранней записи опыта', content: { 'application/json': { schema: { $ref: '#/components/schemas/SiteSettings' } } } },
    },
    $global: {
      components: {
        securitySchemes: {
          adminCookie:  { type: 'apiKey', in: 'cookie', name: 'wms_admin', description: 'JWT сессии админки, выдаётся POST /api/admin/login' },
          publishToken: { type: 'http', scheme: 'bearer', description: 'PUBLISH_TOKEN внешнего публикатора' },
        },
        parameters: {
          locale: { name: 'locale', in: 'query', required: false, description: 'Язык ответа; всё, кроме en, читается как ru', schema: { type: 'string', enum: ['ru', 'en'], default: 'ru' } },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              statusCode:    { type: 'integer' },
              statusMessage: { type: 'string' },
              message:       { type: 'string' },
            },
          },
          Ok: { type: 'object', properties: { ok: { type: 'boolean' } } },
          SiteSettings: {
            type: 'object',
            properties: {
              open_to_work:     { type: 'boolean' },
              show_search:      { type: 'boolean' },
              github_url:       { type: 'string' },
              telegram_url:     { type: 'string' },
              email:            { type: 'string' },
              years_experience: { type: 'integer' },
            },
          },
        },
        responses: {
          BadRequest:      { description: 'Некорректный запрос',       content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          Unauthorized:    { description: 'Нет доступа',               content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          NotFound:        { description: 'Запись не найдена',         content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          TooManyRequests: { description: 'Сработал лимит запросов',    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
})

export default defineCachedEventHandler(fetchSettings, {
  maxAge: 300,
  getKey: () => 'settings',
})
