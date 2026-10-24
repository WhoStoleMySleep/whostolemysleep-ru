import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

const m = vi.hoisted(() => ({
  hit:  vi.fn(async () => ({ allowed: true })),
  send: vi.fn(async () => ({})),
  body: {} as unknown,
}))

vi.mock('~~/server/utils/rateLimit', () => ({ hitRateLimit: m.hit, clientIp: () => '1.2.3.4' }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: m.send }) } }))

async function contact() {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('readBody', async () => m.body)
  vi.stubGlobal('createError', (e: { statusCode: number, message: string }) =>
    Object.assign(new Error(e.message), e))
  const mod = await import('~~/server/api/contact.post')
  return mod.default as unknown as (e: H3Event) => Promise<unknown>
}

const valid = { name: 'Ivan', email: 'ivan@example.com', message: 'Hello, a project for you', consent: true }

beforeEach(() => {
  m.hit.mockClear().mockResolvedValue({ allowed: true })
  m.send.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/contact', () => {
  test('a bot that filled the honeypot is turned away without touching the database', async () => {
    m.body = { ...valid, website: 'spam.example' }
    const handler = await contact()

    await expect(handler({} as H3Event)).rejects.toMatchObject({ statusCode: 400 })
    expect(m.hit).not.toHaveBeenCalled()
  })

  test('a malformed body is turned away without touching the database', async () => {
    m.body = { name: 1 }
    const handler = await contact()

    await expect(handler({} as H3Event)).rejects.toMatchObject({ statusCode: 400 })
    expect(m.hit).not.toHaveBeenCalled()
  })

  test('a valid message is counted and sent', async () => {
    m.body = valid
    const handler = await contact()

    expect(await handler({} as H3Event)).toEqual({ ok: true })
    expect(m.hit).toHaveBeenCalledWith('contact:1.2.3.4', 3, 3_600_000)
    expect(m.send).toHaveBeenCalledTimes(1)
  })

  test('over the limit nothing is sent', async () => {
    m.body = valid
    m.hit.mockResolvedValue({ allowed: false })
    const handler = await contact()

    await expect(handler({} as H3Event)).rejects.toMatchObject({ statusCode: 429 })
    expect(m.send).not.toHaveBeenCalled()
  })
})
