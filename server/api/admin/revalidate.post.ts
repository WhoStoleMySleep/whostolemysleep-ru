import { db } from '~~/server/db'
import * as schema from '~~/server/db/schema'

defineRouteMeta({
  openAPI: {
    tags:        ['Admin: cache'],
    summary:     'Flush the cache for the queued paths',
    description: 'Every path expands into both locales. A queue entry is removed only when both of them refreshed.',
    security:    [{ adminCookie: [] }],
    responses: {
      200: { description: 'ok is false when at least one path did not refresh', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' }, cleared: { type: 'array', items: { type: 'string' } }, failed: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, reason: { type: 'string' } } } } } } } } },
      401: { $ref: '#/components/responses/Unauthorized' },
    },
  },
})

export default defineEventHandler(async () => {
  const pending = await db.select().from(schema.pendingRevalidation)
  if (!pending.length) return { ok: true, cleared: [], failed: [] }

  const queued = pending.map((p) => p.path)

  // A queued path is a "page"; it has two real routes behind it (ru and en).
  const targets = [...new Set(queued.flatMap(withLocales))]
  const { revalidated, failed } = await revalidatePaths(targets)

  // An entry leaves the queue only when both locales refreshed: otherwise the
  // button reports success while half the pages stay stale.
  const broken = new Set(failed.map((f) => f.path))
  const done   = queued.filter((path) => !withLocales(path).some((p) => broken.has(p)))
  await clearPending(done)

  return { ok: !failed.length, cleared: revalidated, failed }
})
