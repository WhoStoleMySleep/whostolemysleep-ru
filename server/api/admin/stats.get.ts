import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { count, eq, or, sql } from 'drizzle-orm'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: дашборд'],
    summary:     'Числа для дашборда',
    description: 'Счётчики постов, длина очереди ревалидации и незаполненные английские поля по разделам.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: {
        description: 'Счётчики постов, длина очереди ревалидации и пробелы в английской версии',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                posts:   { type: 'object', properties: { total: { type: 'integer' }, published: { type: 'integer' }, drafts: { type: 'integer' } } },
                pending: { type: 'integer' },
                missing_en: {
                  type: 'object',
                  description: 'Записи, у которых английские поля пустые; total — их сумма',
                  properties: {
                    posts:      { type: 'integer' },
                    about:      { type: 'integer' },
                    experience: { type: 'integer' },
                    bullets:    { type: 'integer' },
                    education:  { type: 'integer' },
                    skills:     { type: 'integer' },
                    tags:       { type: 'integer' },
                    total:      { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

/**
 * Пустые английские поля по разделам.
 *
 * Английская версия наполняется вручную и отстаёт от русской: публикатор
 * присылает только русский текст, а чтение откатывается на него же — поэтому
 * пробел ничего не ломает и сам о себе не сообщает. Дашборд — единственное
 * место, где его видно.
 */
async function missingEn() {
  const rows = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0

  const [posts, about, experience, bullets, education, skills, tags] = await Promise.all([
    rows(db.select({ n: count() }).from(schema.post)
      .where(or(eq(schema.post.title_en, ''), eq(schema.post.text_en, ''), eq(schema.post.excerpt_en, '')))),
    rows(db.select({ n: count() }).from(schema.aboutMe).where(eq(schema.aboutMe.text_en, ''))),
    rows(db.select({ n: count() }).from(schema.experience).where(eq(schema.experience.position_en, ''))),
    rows(db.select({ n: count() }).from(schema.experienceBullet).where(eq(schema.experienceBullet.text_en, ''))),
    rows(db.select({ n: count() }).from(schema.education).where(eq(schema.education.specialization_en, ''))),
    rows(db.select({ n: count() }).from(schema.skillGroup).where(eq(schema.skillGroup.name_en, ''))),
    rows(db.select({ n: count() }).from(schema.tag).where(eq(schema.tag.name_en, ''))),
  ])

  return {
    posts, about, experience, bullets, education, skills, tags,
    total: posts + about + experience + bullets + education + skills + tags,
  }
}

/**
 * Числа для дашборда. Отдельный эндпоинт, потому что раньше дашборд ради
 * трёх цифр выкачивал все посты со всеми текстами и считал их на клиенте.
 */
export default defineEventHandler(async () => {
  const [posts] = await db
    .select({
      total:     count(),
      published: sql<number>`count(*) filter (where ${schema.post.is_published})`.mapWith(Number),
    })
    .from(schema.post)

  const [pending] = await db
    .select({ total: count() })
    .from(schema.pendingRevalidation)

  const total     = posts?.total ?? 0
  const published = posts?.published ?? 0

  return {
    posts:      { total, published, drafts: total - published },
    pending:    pending?.total ?? 0,
    missing_en: await missingEn(),
  }
})
