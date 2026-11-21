import { flushPending } from '~~/server/utils/pending'

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

export default defineEventHandler(() => flushPending())
