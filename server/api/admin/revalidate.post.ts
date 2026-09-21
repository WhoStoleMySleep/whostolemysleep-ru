import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'

defineRouteMeta({
  openAPI: {
    tags:        ['Админка: кеш'],
    summary:     'Сбросить кеш по очереди',
    description: 'Каждый путь раскрывается в обе локали. Из очереди снимаются только те записи, у которых обновились обе.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: { description: 'ok равен false, если хотя бы один путь не обновился', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, cleared: { type: 'array', items: { type: 'string' } }, failed: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, reason: { type: 'string' } } } } } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async () => {
  const pending = await db.select().from(schema.pendingRevalidation)
  if (!pending.length) return { ok: true, cleared: [], failed: [] }

  const queued = pending.map((p) => p.path)

  // Путь в очереди — «страница», реальных маршрутов у неё два (ru и en).
  const targets = [...new Set(queued.flatMap(withLocales))]
  const { revalidated, failed } = await revalidatePaths(targets)

  // Из очереди снимаем только те записи, у которых обновились обе локали:
  // иначе кнопка отчитается об успехе, а половина страниц останется старой.
  const broken = new Set(failed.map((f) => f.path))
  const done   = queued.filter((path) => !withLocales(path).some((p) => broken.has(p)))
  await clearPending(done)

  return { ok: !failed.length, cleared: revalidated, failed }
})
