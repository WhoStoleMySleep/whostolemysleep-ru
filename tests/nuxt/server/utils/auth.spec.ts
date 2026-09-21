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

describe('токен админки', () => {
  test('подписанный токен читается обратно', async () => {
    const { signAdminToken, readAdminToken } = await import('~~/server/utils/auth')
    const payload = await readAdminToken(await signAdminToken())
    expect(payload?.admin).toBe(true)
  })

  test('чужая подпись не проходит', async () => {
    const { signAdminToken, readAdminToken } = await import('~~/server/utils/auth')
    const token = await signAdminToken()

    vi.stubEnv('ADMIN_JWT_SECRET', 'another-secret')
    expect(await readAdminToken(token)).toBeNull()
  })

  test('мусор вместо токена — null, а не исключение', async () => {
    const { readAdminToken } = await import('~~/server/utils/auth')
    expect(await readAdminToken('не.токен.вовсе')).toBeNull()
    expect(await readAdminToken('')).toBeNull()
  })

  test('валидная подпись без признака админа не пускает', async () => {
    const secret = new TextEncoder().encode('test-secret-value')
    const token = await new SignJWT({ admin: false })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)

    const { readAdminToken } = await import('~~/server/utils/auth')
    expect(await readAdminToken(token)).toBeNull()
  })

  test('истёкший токен не читается', async () => {
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

  test('свежую сессию не трогает — куку переставлять незачем', async () => {
    const setCookie = vi.fn()
    vi.stubGlobal('setCookie', setCookie)

    const { slideAdminSession } = await import('~~/server/utils/auth')
    await slideAdminSession(event, { exp: now() + 7 * 24 * 3600 })

    expect(setCookie).not.toHaveBeenCalled()
  })

  test('сессия на исходе продлевается новым токеном', async () => {
    const setCookie = vi.fn()
    vi.stubGlobal('setCookie', setCookie)

    const { slideAdminSession, ADMIN_COOKIE } = await import('~~/server/utils/auth')
    await slideAdminSession(event, { exp: now() + 3600 })

    expect(setCookie).toHaveBeenCalledTimes(1)
    expect(setCookie.mock.calls[0]?.[1]).toBe(ADMIN_COOKIE)
    expect(setCookie.mock.calls[0]?.[3]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
  })

  test('полезная нагрузка без срока — не повод продлевать', async () => {
    const setCookie = vi.fn()
    vi.stubGlobal('setCookie', setCookie)

    const { slideAdminSession } = await import('~~/server/utils/auth')
    await slideAdminSession(event, {})

    expect(setCookie).not.toHaveBeenCalled()
  })
})

describe('assertAdminConfig', () => {
  test('при полном наборе переменных молчит', async () => {
    const { assertAdminConfig } = await import('~~/server/utils/auth')
    expect(() => assertAdminConfig()).not.toThrow()
  })

  test('называет все недостающие переменные, а не говорит «неверный пароль»', async () => {
    vi.stubEnv('ADMIN_JWT_SECRET', '')
    vi.stubEnv('ADMIN_PASSWORD_HASH', '')

    const { assertAdminConfig } = await import('~~/server/utils/auth')
    expect(() => assertAdminConfig()).toThrow(/ADMIN_JWT_SECRET, ADMIN_PASSWORD_HASH/)
  })
})
