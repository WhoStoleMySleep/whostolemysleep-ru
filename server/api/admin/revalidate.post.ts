import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'

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
