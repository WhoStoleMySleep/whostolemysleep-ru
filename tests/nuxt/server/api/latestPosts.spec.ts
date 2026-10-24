import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

const m = vi.hoisted(() => ({
  findMany: vi.fn(async (_query: unknown): Promise<unknown[]> => []),
  locale:   'ru',
}))

vi.mock('~~/server/db', () => ({ db: { query: { post: { findMany: m.findMany } } } }))

async function latest() {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineCachedEventHandler', (fn: unknown, opts: unknown) => Object.assign(fn as object, { opts }))
  vi.stubGlobal('getQuery', () => ({ locale: m.locale }))
  const mod = await import('~~/server/api/posts/latest.get')
  return mod.default as unknown as ((e: H3Event) => Promise<unknown[]>) & { opts: { getKey: (e: H3Event) => string } }
}

beforeEach(() => {
  m.findMany.mockClear().mockResolvedValue([])
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/posts/latest', () => {
  test('asks the database for four rows and no bodies', async () => {
    const handler = await latest()
    await handler({} as H3Event)

    const query = m.findMany.mock.calls[0]?.[0] as { limit: number, columns: Record<string, boolean> }
    expect(query.limit).toBe(4)
    expect(query.columns).toEqual({ text_ru: false, text_en: false })
  })

  test('an unknown locale lands in the same cache entry as ru instead of a new one', async () => {
    const handler = await latest()

    m.locale = 'xyz123'
    const junk = handler.opts.getKey({} as H3Event)
    m.locale = 'ru'

    expect(junk).toBe(handler.opts.getKey({} as H3Event))
  })
})
