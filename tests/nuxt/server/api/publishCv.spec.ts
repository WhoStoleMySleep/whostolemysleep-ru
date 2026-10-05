import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import type { CvSnapshot } from '~~/server/utils/cv'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const TOKEN = 'cv-token'
let headers: Record<string, string> = {}

async function read(token?: string): Promise<CvSnapshot> {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('getRequestIP', () => '1.2.3.4')
  vi.stubGlobal('setResponseHeader', (_e: unknown, name: string, value: string) => { headers[name] = value })
  vi.stubGlobal('getRequestHeader', (_e: unknown, name: string) =>
    (name.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : undefined))
  const mod = await import('~~/server/api/publish/cv.get')
  return (mod.default as (e: H3Event) => Promise<CvSnapshot>)({} as H3Event)
}

function quota(count: number) {
  return { 'insert:rate_limit': [[{ key: 'cv:1.2.3.4', count, reset_at: new Date(Date.now() + 600_000).toISOString() }]] }
}

beforeEach(() => {
  headers = {}
  plan(state, quota(1), {
    aboutMe:    [{ text_ru: 'Фронтенд-разработчик', text_en: 'Frontend developer' }],
    experience: [],
    education:  [],
    skillGroup: [{ slug: 'front', name_ru: 'Фронтенд', name_en: 'Frontend', skills: [{ name: 'Vue' }, { name: 'Nuxt' }] }],
  })
  vi.stubEnv('CV_TOKEN', TOKEN)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('GET /api/publish/cv', () => {
  test('the hub gets the same snapshot as the admin export, never cached', async () => {
    const cv = await read(TOKEN)

    expect(cv.about.text_en).toBe('Frontend developer')
    expect(cv.skills[0]?.slug).toBe('front')
    expect(headers['cache-control']).toBe('no-store')
  })

  test('without the token there is no resume', async () => {
    await expect(read()).rejects.toThrow(/Unauthorized/)
    await expect(read('wrong')).rejects.toThrow(/Unauthorized/)
  })

  test('a flood is cut off before the token is even checked', async () => {
    plan(state, quota(61))
    await expect(read(TOKEN)).rejects.toThrow(/Too many requests/)
  })
})
