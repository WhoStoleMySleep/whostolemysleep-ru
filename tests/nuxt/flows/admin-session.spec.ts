import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const SECRET   = 'test-secret-key-for-admin-session'
const PASSWORD = 'the right password'
const HASH     = bcrypt.hashSync(PASSWORD, 4)

const event = {} as H3Event

/** The browser cookie jar: login writes into it, the guard reads from it. */
let jar: Record<string, string> = {}
const cookieOpts: Record<string, unknown>[] = []

function nitro(body?: unknown, path = '/api/admin/posts') {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('readBody', async () => body)
  vi.stubGlobal('getRequestURL', () => new URL(`https://example.com${path}`))
  vi.stubGlobal('getRequestHeader', () => undefined)
  vi.stubGlobal('getRequestIP', () => '1.2.3.4')
  vi.stubGlobal('setCookie', (_e: unknown, name: string, value: string, opts: Record<string, unknown>) => {
    jar[name] = value
    cookieOpts.push(opts)
  })
  vi.stubGlobal('getCookie', (_e: unknown, name: string) => jar[name])
}

async function run(path: string, body?: unknown, url?: string) {
  nitro(body, url)
  const mod = await import(/* @vite-ignore */ path)
  return (mod.default as (e: H3Event) => Promise<unknown>)(event)
}

const login = (password: string) => run('~~/server/api/admin/login.post', { password })
const guard = (url = '/api/admin/posts') => run('~~/server/middleware/admin-guard', undefined, url)
const me    = () => run('~~/server/api/admin/me.get')

/** The attempt counter: by default this is the first attempt from the address. */
function attempts(count: number) {
  plan(state, { 'insert:rate_limit': [[{ key: 'login:1.2.3.4', count, reset_at: new Date(Date.now() + 600_000).toISOString() }]] })
}

beforeEach(() => {
  jar = {}
  cookieOpts.length = 0
  attempts(1)
  vi.stubEnv('ADMIN_JWT_SECRET', SECRET)
  vi.stubEnv('ADMIN_PASSWORD_HASH', HASH)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('admin sign-in: login → cookie → protected route', () => {
  test('the right password issues a cookie and resets the failure counter', async () => {
    await expect(login(PASSWORD)).resolves.toEqual({ ok: true })

    expect(jar.wms_admin).toBeTruthy()
    expect(cookieOpts[0]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    expect(state.calls.some((c) => `${c.op}:${c.table}` === 'delete:rate_limit')).toBe(true)
  })

  test('the cookie received opens a protected route', async () => {
    await login(PASSWORD)

    await expect(guard()).resolves.toBeUndefined()
    await expect(me()).resolves.toEqual({ admin: true })
  })

  test('a wrong password is a 401 and no cookie', async () => {
    await expect(login('someone else')).rejects.toThrow(/Invalid password/)
    expect(jar.wms_admin).toBeUndefined()
  })

  test('without signing in a protected route stays closed', async () => {
    await expect(guard()).rejects.toThrow(/Unauthorized/)
  })

  test('a forged cookie does not pass', async () => {
    jar.wms_admin = 'clearly.not.a.jwt'
    await expect(guard()).rejects.toThrow(/Invalid token/)
  })

  test('changing ADMIN_JWT_SECRET closes the open sessions', async () => {
    await login(PASSWORD)
    vi.stubEnv('ADMIN_JWT_SECRET', 'a different secret than the one used at login')

    await expect(guard()).rejects.toThrow(/Invalid token/)
  })

  test('a token without the admin flag is no good even when the signature is valid', async () => {
    jar.wms_admin = await new SignJWT({ admin: false })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET))

    await expect(guard()).rejects.toThrow(/Invalid token/)
  })
})

describe('attempt limit', () => {
  test('after five failures the login waits, even with the right password', async () => {
    attempts(6)
    await expect(login(PASSWORD)).rejects.toThrow(/Too many attempts/)
    expect(jar.wms_admin).toBeUndefined()
  })

  test('an unconfigured server answers about configuration and spends no attempt', async () => {
    vi.stubEnv('ADMIN_PASSWORD_HASH', '')

    await expect(login(PASSWORD)).rejects.toThrow(/Not configured/)
    expect(state.calls).toHaveLength(0)
  })
})

describe('sliding session', () => {
  test('a fresh session is not rewritten on every request', async () => {
    await login(PASSWORD)
    const issued = jar.wms_admin

    await guard()
    expect(jar.wms_admin).toBe(issued)
    expect(cookieOpts).toHaveLength(1)
  })

  test('a session near its end renews itself', async () => {
    jar.wms_admin = await new SignJWT({ admin: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1d')
      .sign(new TextEncoder().encode(SECRET))
    const old = jar.wms_admin

    await guard()

    expect(jar.wms_admin).not.toBe(old)
    expect(cookieOpts).toHaveLength(1)
  })
})
