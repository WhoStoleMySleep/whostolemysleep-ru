import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { SignJWT } from 'jose'
import type { H3Event } from 'h3'

const event = {} as H3Event

beforeEach(() => {
  vi.stubEnv('ADMIN_JWT_SECRET', 'test-secret-value')
  vi.stubEnv('ADMIN_PASSWORD_HASH', '$2b$10$hash')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('admin token', () => {
  test('a signed token reads back', async () => {
    const { signAdminToken, readAdminToken } = await import('~~/server/utils/auth')
    const payload = await readAdminToken(await signAdminToken())
    expect(payload?.admin).toBe(true)
  })

  test('a foreign signature does not pass', async () => {
    const { signAdminToken, readAdminToken } = await import('~~/server/utils/auth')
    const token = await signAdminToken()

    vi.stubEnv('ADMIN_JWT_SECRET', 'another-secret')
    expect(await readAdminToken(token)).toBeNull()
  })

  test('garbage instead of a token is null, not an exception', async () => {
    const { readAdminToken } = await import('~~/server/utils/auth')
    expect(await readAdminToken('not.a.token.at.all')).toBeNull()
    expect(await readAdminToken('')).toBeNull()
  })

  test('a valid signature without the admin flag does not let anyone in', async () => {
    const secret = new TextEncoder().encode('test-secret-value')
    const token = await new SignJWT({ admin: false })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)

    const { readAdminToken } = await import('~~/server/utils/auth')
    expect(await readAdminToken(token)).toBeNull()
  })

  test('an expired token does not read back', async () => {
    const secret = new TextEncoder().encode('test-secret-value')
    const token = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret)

    const { readAdminToken } = await import('~~/server/utils/auth')
    expect(await readAdminToken(token)).toBeNull()
  })
})

describe('slideAdminSession', () => {
  const now = () => Math.floor(Date.now() / 1000)

  test('it leaves a fresh session alone — no reason to reset the cookie', async () => {
    const setCookie = vi.fn()
    vi.stubGlobal('setCookie', setCookie)

    const { slideAdminSession } = await import('~~/server/utils/auth')
    await slideAdminSession(event, { exp: now() + 7 * 24 * 3600 })

    expect(setCookie).not.toHaveBeenCalled()
  })

  test('a session near its end is renewed with a new token', async () => {
    const setCookie = vi.fn()
    vi.stubGlobal('setCookie', setCookie)

    const { slideAdminSession, ADMIN_COOKIE } = await import('~~/server/utils/auth')
    await slideAdminSession(event, { exp: now() + 3600 })

    expect(setCookie).toHaveBeenCalledTimes(1)
    expect(setCookie.mock.calls[0]?.[1]).toBe(ADMIN_COOKIE)
    expect(setCookie.mock.calls[0]?.[3]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
  })

  test('a payload with no expiry is no reason to renew', async () => {
    const setCookie = vi.fn()
    vi.stubGlobal('setCookie', setCookie)

    const { slideAdminSession } = await import('~~/server/utils/auth')
    await slideAdminSession(event, {})

    expect(setCookie).not.toHaveBeenCalled()
  })
})

describe('assertAdminConfig', () => {
  test('it stays silent when every variable is set', async () => {
    const { assertAdminConfig } = await import('~~/server/utils/auth')
    expect(() => assertAdminConfig()).not.toThrow()
  })

  test('it names every missing variable instead of saying "wrong password"', async () => {
    vi.stubEnv('ADMIN_JWT_SECRET', '')
    vi.stubEnv('ADMIN_PASSWORD_HASH', '')

    const { assertAdminConfig } = await import('~~/server/utils/auth')
    expect(() => assertAdminConfig()).toThrow(/ADMIN_JWT_SECRET, ADMIN_PASSWORD_HASH/)
  })
})
