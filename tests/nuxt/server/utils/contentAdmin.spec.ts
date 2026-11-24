import { PgDialect } from 'drizzle-orm/pg-core'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import type { ContentActor } from '~~/server/utils/contentAuth'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const create = vi.hoisted(() => vi.fn())
const execute = vi.hoisted(() => vi.fn())
vi.mock('~~/server/db', async () => {
  const fake = (await import('~~/tests/helpers/fakeDb')).makeFakeDb(state) as object
  return { db: new Proxy(fake, { get: (target, key) => key === 'execute' ? execute : Reflect.get(target, key) }) }
})
vi.mock('~~/server/utils/contentPlans', async importOriginal => ({ ...await importOriginal<object>(), createContentPlan: create }))
const actor: ContentActor = { id: 'admin', tokenId: null, environment: 'development', resources: [], scopes: [] }
const id = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  plan(state)
  execute.mockReset().mockResolvedValue({ rows: [] })
  create.mockReset().mockResolvedValue({ id, status: 'pending' })
  vi.stubEnv('CONTENT_ENVIRONMENT', 'development')
  vi.stubEnv('CONTENT_WRITE_ENABLED', 'true')
})
afterEach(() => vi.unstubAllEnvs())

describe('Административные token/history операции', () => {
  test('issue возвращает секрет единожды и сохраняет только SHA256 с ресурсными scopes', async () => {
    const { issueContentToken } = await import('~~/server/utils/contentAdmin')
    const issued = await issueContentToken(actor, { label: 'MCP', resources: ['pages'], scopes: ['read', 'plan'], expiresInDays: 1 })
    expect(issued.token).toMatch(/^wms_content_/)
    const stored = stepArg<Record<string, unknown>>(state.calls, 'insert:content_token', 'values')!
    expect(stored).toMatchObject({ id: issued.id, environment: 'development', resources: ['pages'], scopes: ['read', 'plan'] })
    expect(stored.secret_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(stored)).not.toContain(issued.token)
    expect(stored).not.toHaveProperty('token')
  })

  test('token list и history не раскрывают secret_hash, expected_state и approve metadata', async () => {
    const { listContentTokens, listContentHistory } = await import('~~/server/utils/contentAdmin')
    plan(state, {
      'select:content_token': [[{ id, label: 'MCP', resources: ['pages'], scopes: ['read'], expires_at: '2030-01-01T00:00:00Z', revoked_at: null, secret_hash: 'secret' }]],
      'select:content_history': [[{ id, environment: 'development', resource: 'pages', record_id: 1, created_at: '2026-01-01T00:00:00Z', before: { ru: {}, en: {} }, after: { ru: {}, en: {} }, actor: 'admin', approved_by: 'admin', expected_state: 'private' }]],
    })
    execute.mockResolvedValue({ rows: [{ id, label: 'MCP', resources: ['pages'], scopes: ['read'], expires_at: '2030-01-01T00:00:00Z', revoked_at: null, secret_hash: 'secret' }] })
    const tokens = await listContentTokens(actor)
    expect(tokens[0]).not.toHaveProperty('secret_hash')
    expect(tokens[0]).not.toHaveProperty('token')
    const history = await listContentHistory(actor, 'pages', 1)
    expect(history[0]).not.toHaveProperty('expected_state')
    expect(history[0]).not.toHaveProperty('approved_by')
  })

  test('более100 действующих credentials доступны для отзыва, история ограничена отдельно', async () => {
    const { listContentTokens, revokeContentToken } = await import('~~/server/utils/contentAdmin')
    const active = Array.from({ length: 150 }, (_, index) => ({ id: `active-${index}`, label: 'MCP', resources: ['pages'], scopes: ['read'], expires_at: '2099-01-01T00:00:00Z', revoked_at: null }))
    const inactive = Array.from({ length: 100 }, (_, index) => ({ ...active[0]!, id: `inactive-${index}`, revoked_at: '2025-01-01T00:00:00Z' }))
    execute.mockResolvedValue({ rows: [...active, ...inactive] })
    const result = await listContentTokens(actor)
    expect(result).toHaveLength(250)
    expect(result[149]?.id).toBe('active-149')
    expect(execute).toHaveBeenCalledTimes(1)
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0])
    expect(query.sql).toContain('union all')
    expect(query.sql).toContain('revoked_at is null and expires_at > now()')
    expect(query.sql).toContain('revoked_at is not null or expires_at <= now()')
    expect(query.sql).toMatch(/order by created_at desc limit \$\d+/)
    expect(query.sql).not.toContain('secret_hash')
    expect(query.params).toEqual(['development', 'development', 100])
    await revokeContentToken(actor, result[149]!.id)
    expect(stepArg(state.calls, 'update:content_token', 'set')).toHaveProperty('revoked_at')
  })

  test('revoke только помечает credential, не удаляет историю и планы', async () => {
    const { revokeContentToken } = await import('~~/server/utils/contentAdmin')
    expect(await revokeContentToken(actor, id)).toEqual({ revoked: true })
    expect(state.calls).toHaveLength(1)
    expect(state.calls[0]).toMatchObject({ op: 'update', table: 'content_token' })
    expect(stepArg(state.calls, 'update:content_token', 'set')).toHaveProperty('revoked_at')
  })

  test('restore создаёт новый pending plan из history.before, не делает live write', async () => {
    const { restoreContentPlan } = await import('~~/server/utils/contentAdmin')
    const before = { ru: { 'hero.line1': 'Старый текст' }, en: {} }
    plan(state, { 'select:content_history': [[{ id, resource: 'pages', record_id: 1, before }]] })
    await expect(restoreContentPlan(actor, id, 'a'.repeat(64))).resolves.toEqual({ id, status: 'pending' })
    expect(create).toHaveBeenCalledWith(actor, { resource: 'pages', recordId: 1, expectedVersion: 'a'.repeat(64), patch: before })
    expect(state.calls).toHaveLength(1)
    expect(state.calls[0]?.op).toBe('select')
  })

  test('история создания проекта не маскируется под восстановление скалярных полей', async () => {
    const { restoreContentPlan } = await import('~~/server/utils/contentAdmin')
    plan(state, { 'select:content_history': [[{ id, resource: 'post', record_id: 1, before: {} }]] })
    await expect(restoreContentPlan(actor, id, 'a'.repeat(64))).rejects.toThrow('cannot be restored')
    expect(create).not.toHaveBeenCalled()
  })

  test('неизвестная история и token actor не имеют restore permission', async () => {
    const { restoreContentPlan, issueContentToken } = await import('~~/server/utils/contentAdmin')
    await expect(restoreContentPlan(actor, id, 'a'.repeat(64))).rejects.toThrow('not found')
    await expect(issueContentToken({ ...actor, id: `token:${id}`, tokenId: id }, { label: 'X', resources: ['pages'], scopes: ['read'], expiresInDays: 1 })).rejects.toThrow('Admin approval')
  })

  test('все control mutations выключены без CONTENT_WRITE_ENABLED', async () => {
    const { restoreContentPlan, revokeContentToken, issueContentToken } = await import('~~/server/utils/contentAdmin')
    vi.stubEnv('CONTENT_WRITE_ENABLED', 'false')
    await expect(restoreContentPlan(actor, id, 'a'.repeat(64))).rejects.toThrow('disabled')
    await expect(revokeContentToken(actor, id)).rejects.toThrow('disabled')
    await expect(issueContentToken(actor, { label: 'X', resources: ['pages'], scopes: ['read'], expiresInDays: 1 })).rejects.toThrow('disabled')
    expect(state.calls).toHaveLength(0)
  })
})
