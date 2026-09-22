import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const event = {} as H3Event

function row(count: number, inSeconds = 60) {
  return { key: 'k', count, reset_at: new Date(Date.now() + inSeconds * 1000).toISOString() }
}

beforeEach(() => {
  plan(state)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('hitRateLimit', () => {
  test('an attempt within the limit passes', async () => {
    plan(state, { 'insert:rate_limit': [[row(3)]] })
    const { hitRateLimit } = await import('~~/server/utils/rateLimit')

    expect(await hitRateLimit('k', 5, 60_000)).toEqual({ allowed: true })
  })

  test('an attempt exactly at the boundary still passes', async () => {
    plan(state, { 'insert:rate_limit': [[row(5)]] })
    const { hitRateLimit } = await import('~~/server/utils/rateLimit')

    expect(await hitRateLimit('k', 5, 60_000)).toEqual({ allowed: true })
  })

  test('past the boundary it is a refusal plus the time left in the window', async () => {
    plan(state, { 'insert:rate_limit': [[row(6, 120)]] })
    const { hitRateLimit } = await import('~~/server/utils/rateLimit')

    const verdict = await hitRateLimit('k', 5, 60_000)
    expect(verdict.allowed).toBe(false)
    expect(verdict.retryAfter).toBeGreaterThan(115)
    expect(verdict.retryAfter).toBeLessThanOrEqual(120)
  })

  test('an expired window does not return a zero or negative retryAfter', async () => {
    plan(state, { 'insert:rate_limit': [[row(6, -30)]] })
    const { hitRateLimit } = await import('~~/server/utils/rateLimit')

    expect((await hitRateLimit('k', 5, 60_000)).retryAfter).toBe(1)
  })

  test('the database returned no row — let it through, a counter is no reason to close the door', async () => {
    plan(state, { 'insert:rate_limit': [[]] })
    const { hitRateLimit } = await import('~~/server/utils/rateLimit')

    expect(await hitRateLimit('k', 5, 60_000)).toEqual({ allowed: true })
  })

  test('the first attempt opens a window with the counter at 1', async () => {
    plan(state, { 'insert:rate_limit': [[row(1)]] })
    const { hitRateLimit } = await import('~~/server/utils/rateLimit')
    await hitRateLimit('login:1.2.3.4', 5, 60_000)

    const values = stepArg<Record<string, unknown>>(state.calls, 'insert:rate_limit', 'values')
    expect(values?.key).toBe('login:1.2.3.4')
    expect(values?.count).toBe(1)
    expect(typeof values?.reset_at).toBe('string')
  })
})

describe('clearRateLimit', () => {
  test('it clears the counter', async () => {
    const { clearRateLimit } = await import('~~/server/utils/rateLimit')
    await clearRateLimit('login:1.2.3.4')

    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'delete:rate_limit')).toBe(true)
  })
})

describe('checkRateLimit', () => {
  test('it returns only yes/no — the contact form caller expects a boolean', async () => {
    plan(state, { 'insert:rate_limit': [[row(1)], [row(99)]] })
    const { checkRateLimit } = await import('~~/server/utils/rateLimit')

    expect(await checkRateLimit('contact:ip', 3, 60_000)).toBe(true)
    expect(await checkRateLimit('contact:ip', 3, 60_000)).toBe(false)
  })
})

describe('clientIp', () => {
  function headers(map: Record<string, string | undefined>, socket?: string) {
    vi.stubGlobal('getRequestHeader', (_: unknown, name: string) => map[name])
    vi.stubGlobal('getRequestIP', () => socket)
  }

  test('the Vercel header wins, and the first address of the chain is taken', async () => {
    headers({ 'x-vercel-forwarded-for': ' 1.1.1.1 , 2.2.2.2 ', 'x-real-ip': '3.3.3.3' }, '4.4.4.4')
    const { clientIp } = await import('~~/server/utils/rateLimit')

    expect(clientIp(event)).toBe('1.1.1.1')
  })

  test('with no Vercel header x-real-ip is used', async () => {
    headers({ 'x-real-ip': ' 3.3.3.3 ' }, '4.4.4.4')
    const { clientIp } = await import('~~/server/utils/rateLimit')

    expect(clientIp(event)).toBe('3.3.3.3')
  })

  test('x-forwarded-for is ignored: the client sends it itself', async () => {
    headers({ 'x-forwarded-for': '9.9.9.9' }, '4.4.4.4')
    const { clientIp } = await import('~~/server/utils/rateLimit')

    expect(clientIp(event)).toBe('4.4.4.4')
  })

  test('with nothing at all a placeholder address, not an empty string in the limiter key', async () => {
    headers({}, undefined)
    const { clientIp } = await import('~~/server/utils/rateLimit')

    expect(clientIp(event)).toBe('0.0.0.0')
  })
})
