import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import type { H3Event } from 'h3'
import type { contentToken } from '~~/server/db/schema'
import type { ContentActor } from '~~/server/utils/contentAuth'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import { plan } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const rate = vi.hoisted(() => vi.fn(async () => ({ allowed: true })))
const admin = vi.hoisted(() => vi.fn(async () => ({ admin: true } as unknown)))
vi.mock('~~/server/db', async () => ({ db: (await import('~~/tests/helpers/fakeDb')).makeFakeDb(state) }))
vi.mock('~~/server/utils/rateLimit', () => ({ hitRateLimit: rate }))
vi.mock('~~/server/utils/auth', () => ({ ADMIN_COOKIE: 'wms_admin', readAdminToken: admin }))

const tokenId = '11111111-1111-4111-8111-111111111111'
const actor: ContentActor = { id: `token:${tokenId}`, tokenId, environment: 'development', resources: ['pages'], scopes: ['read', 'plan'] }
function tokenRow(overrides: Partial<typeof contentToken.$inferSelect> = {}): typeof contentToken.$inferSelect {
  return { id: tokenId, environment: 'development', label: 'MCP', secret_hash: 'a'.repeat(64), resources: ['pages'], scopes: ['read', 'plan'], expires_at: new Date(Date.now() + 60000).toISOString(), revoked_at: null, created_at: new Date().toISOString(), ...overrides }
}

beforeEach(() => {
  plan(state)
  vi.stubEnv('CONTENT_ENVIRONMENT', 'development')
  vi.stubEnv('CONTENT_WRITE_ENABLED', 'true')
  rate.mockResolvedValue({ allowed: true })
  admin.mockResolvedValue({ admin: true })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Content credential и полномочия', () => {
  test('секрет случаен, хеш SHA256 стабилен и не равен секрету', async () => {
    const { generateContentCredential, hashContentSecret } = await import('~~/server/utils/contentAuth')
    const one = generateContentCredential()
    const two = generateContentCredential()
    expect(one.token).toMatch(/^wms_content_[\w-]{43}$/)
    expect(one.token).not.toBe(two.token)
    expect(hashContentSecret(one.token)).toHaveLength(64)
    expect(hashContentSecret(one.token)).toBe(hashContentSecret(one.token))
    expect(hashContentSecret(one.token)).not.toBe(one.token)
  })

  test.each([
    undefined, tokenRow({ revoked_at: new Date().toISOString() }),
    tokenRow({ expires_at: '2000-01-01T00:00:00Z' }), tokenRow({ expires_at: 'invalid' }),
    tokenRow({ environment: 'production' }),
  ])('не принимает отсутствующий/просроченный/отозванный/cross-env token', async row => {
    const { contentTokenActor } = await import('~~/server/utils/contentAuth')
    expect(() => contentTokenActor(row, 'development')).toThrow('Invalid or expired')
  })

  test('проверяет ресурс и scope независимо', async () => {
    const { assertContentPermission } = await import('~~/server/utils/contentAuth')
    expect(() => assertContentPermission(actor, 'pages', 'read')).not.toThrow()
    expect(() => assertContentPermission(actor, 'post', 'read')).toThrow('scope')
    expect(() => assertContentPermission(actor, 'pages', 'apply')).toThrow('scope')
  })

  test('токен не может использовать чужой или admin plan', async () => {
    const { assertContentOwnership } = await import('~~/server/utils/contentAuth')
    expect(() => assertContentOwnership(actor, tokenId)).not.toThrow()
    expect(() => assertContentOwnership(actor, 'another')).toThrow('another actor')
    expect(() => assertContentOwnership(actor, null)).toThrow('another actor')
    expect(() => assertContentOwnership({ ...actor, id: 'admin', tokenId: null }, tokenId)).not.toThrow()
  })

  test('approve недоступен токену даже при прямом вызове сервиса', async () => {
    const { assertContentAdminActor, approveContentPlan } = await import('~~/server/utils/contentPlans')
    expect(() => assertContentAdminActor(actor)).toThrow('Admin approval')
    await expect(approveContentPlan(actor, tokenId)).rejects.toThrow('Admin approval')
    expect(state.calls).toHaveLength(0)
  })

  test('Bearer endpoint отвергает publish token и не использует cookie', async () => {
    const { requireContentBearer } = await import('~~/server/utils/contentAuth')
    vi.stubGlobal('getRequestHeader', () => 'Bearer publish-secret')
    await expect(requireContentBearer({} as H3Event)).rejects.toThrow('Content Bearer')
    expect(state.calls).toHaveLength(0)
  })

  test('каждый вызов заново читает отозванный credential из БД', async () => {
    const { requireContentBearer } = await import('~~/server/utils/contentAuth')
    vi.stubGlobal('getRequestHeader', () => `Bearer wms_content_${'a'.repeat(43)}`)
    plan(state, { 'select:content_token': [[tokenRow()], [tokenRow({ revoked_at: new Date().toISOString() })]] })
    await expect(requireContentBearer({} as H3Event)).resolves.toMatchObject({ id: actor.id })
    await expect(requireContentBearer({} as H3Event)).rejects.toThrow('Invalid or expired')
    expect(state.calls).toHaveLength(2)
  })

  test('квота разделена по actor/environment/action и fail closed', async () => {
    const { contentQuota } = await import('~~/server/utils/contentAuth')
    await contentQuota(actor, 'plan')
    expect(rate).toHaveBeenCalledWith(`content:development:${actor.id}:plan`, 20, 60000)
    rate.mockResolvedValue({ allowed: false })
    await expect(contentQuota(actor, 'apply')).rejects.toThrow('quota')
  })

  test('cookie отдельно проверяется в новых admin endpoints', async () => {
    const { requireContentAdmin } = await import('~~/server/utils/contentAuth')
    vi.stubGlobal('getCookie', () => undefined)
    await expect(requireContentAdmin({} as H3Event)).rejects.toThrow('Admin session')
    vi.stubGlobal('getCookie', () => 'signed')
    await expect(requireContentAdmin({} as H3Event)).resolves.toMatchObject({ id: 'admin', tokenId: null })
    admin.mockResolvedValue(null)
    await expect(requireContentAdmin({} as H3Event)).rejects.toThrow('Admin session')
  })
})
