import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

interface Stats {
  posts:      { total: number, published: number, drafts: number }
  pending:    number
  missing_en: Record<string, number>
}

async function stats() {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  const mod = await import('~~/server/api/admin/stats.get')
  return (mod.default as (e: H3Event) => Promise<Stats>)({} as H3Event)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  plan(state, {
    'select:post':                [[{ total: 10, published: 7 }], [{ n: 3 }]],
    'select:pending_revalidation': [[{ total: 4 }]],
    'select:about_me':             [[{ n: 1 }]],
    'select:experience':           [[{ n: 2 }]],
    'select:experience_bullet':    [[{ n: 5 }]],
    'select:education':            [[{ n: 0 }]],
    'select:skill_group':          [[{ n: 1 }]],
    'select:tag':                  [[{ n: 6 }]],
  })
})

describe('dashboard numbers', () => {
  test('drafts are counted as a difference, not with a separate query', async () => {
    const out = await stats()

    expect(out.posts).toEqual({ total: 10, published: 7, drafts: 3 })
    expect(out.pending).toBe(4)
  })

  test('the English gaps arrive per section and as a total', async () => {
    const out = await stats()

    expect(out.missing_en).toEqual({
      posts: 3, about: 1, experience: 2, bullets: 5,
      education: 0, skills: 1, tags: 6, total: 18,
    })
  })

  test('an empty database does not break the counters with zeros out of nowhere', async () => {
    plan(state)
    const out = await stats()

    expect(out.posts).toEqual({ total: 0, published: 0, drafts: 0 })
    expect(out.missing_en.total).toBe(0)
  })
})
