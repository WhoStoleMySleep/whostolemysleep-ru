import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { contentPlan } from '~~/server/db/schema'
import type { ContentActor } from '~~/server/utils/contentAuth'

const mocks = vi.hoisted(() => ({ plan: vi.fn(), load: vi.fn(), execute: vi.fn(), dirty: vi.fn(), paths: vi.fn() }))
vi.mock('~~/server/db', () => ({ db: { execute: mocks.execute } }))
vi.mock('~~/server/utils/contentPlans', () => ({ loadContentPlan: mocks.plan }))
vi.mock('~~/server/utils/contentRecords', async importOriginal => ({ ...await importOriginal<object>(), loadContent: mocks.load }))
vi.mock('~~/server/utils/pending', () => ({ markDirty: mocks.dirty, sitePaths: mocks.paths, resumePaths: () => ['/', '/resume', '/cv'], postPaths: () => ['/', '/blog'] }))
const id = '11111111-1111-4111-8111-111111111111'
const actor: ContentActor = { id: `token:${id}`, tokenId: id, environment: 'development', resources: ['pages'], scopes: ['apply'] }
function row(overrides: Partial<typeof contentPlan.$inferSelect> = {}): typeof contentPlan.$inferSelect {
  return { id, environment: 'development', resource: 'pages', record_id: 1, actor: actor.id, token_id: id, version: 'a'.repeat(64), expected_state: { data: { ru: {}, en: {} } }, before: { ru: {}, en: {} }, after: { ru: { 'hero.line1': 'Новый текст' }, en: {} }, diff: [], status: 'approved', expires_at: new Date(Date.now() + 60000).toISOString(), approved_by: 'admin', approved_at: new Date().toISOString(), applied_at: null, created_at: new Date().toISOString(), ...overrides }
}

beforeEach(() => {
  vi.stubEnv('CONTENT_WRITE_ENABLED', 'true')
  vi.stubEnv('CONTENT_ENVIRONMENT', 'development')
  mocks.plan.mockReset().mockResolvedValue(row())
  mocks.load.mockReset().mockResolvedValue({ snapshot: { version: 'a'.repeat(64) } })
  mocks.execute.mockReset().mockResolvedValue({ rows: [{ id }] })
  mocks.dirty.mockReset().mockResolvedValue(undefined)
  mocks.paths.mockReset().mockResolvedValue(['/'])
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Атомарное применение approved plan', () => {
  test('SQL связывает row locks, CAS, update RETURNING, audit и applied в одном statement', async () => {
    const { buildContentApplySql } = await import('~~/server/utils/contentApply')
    const query = new PgDialect().sqlToQuery(buildContentApplySql(actor, row()))
    expect(query.sql).toContain('caller_token as materialized')
    expect(query.sql).toContain("t.scopes ? 'apply' for share")
    expect(query.sql).toContain('t.revoked_at is null')
    expect(query.sql).toContain("p.status = 'approved'")
    expect(query.sql).toContain("p.approved_by = 'admin'")
    expect(query.sql).toContain('for update of live')
    expect(query.sql).toContain('to_jsonb(live) = p.expected_state')
    expect(query.sql).toMatch(/updated as \([\s\S]*returning live\.\*/)
    expect(query.sql).toContain('where exists(select 1 from updated) returning plan_id')
    expect(query.sql).toContain('from audit where p.id = audit.plan_id returning p.id')
    expect(query.sql).not.toContain('Новый текст')
    expect(query.params).toContain('{"ru":{"hero.line1":"Новый текст"},"en":{}}')
  })

  test('все scalar tables выбираются из статического allowlist, значения параметризованы', async () => {
    const { buildContentApplySql } = await import('~~/server/utils/contentApply')
    for (const resource of ['post', 'about', 'settings', 'experience', 'education', 'skill', 'skill-group'] as const) {
      const query = new PgDialect().sqlToQuery(buildContentApplySql(actor, row({ resource, after: {} })))
      expect(query.sql).toContain('insert into content_history')
      expect(query.sql).toContain('target.matches returning live.*')
      expect(query.params).toContain(resource)
    }
  })

  test('pending требует подтверждения, а expired approved не применяется', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    mocks.plan.mockResolvedValue(row({ status: 'pending', approved_by: null }))
    await expect(applyContentPlan(actor, id)).rejects.toThrow('admin approval')
    mocks.plan.mockResolvedValue(row({ expires_at: '2000-01-01T00:00:00Z' }))
    await expect(applyContentPlan(actor, id)).rejects.toThrow('expired')
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  test('идемпотентный повтор не выполняет update или audit', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    mocks.plan.mockResolvedValue(row({ status: 'applied' }))
    await expect(applyContentPlan(actor, id)).resolves.toEqual({ status: 'applied', planId: id })
    expect(mocks.execute).not.toHaveBeenCalled()
  })

  test('оптимистический конфликт до write и race conflict в SQL возвращают 409', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    mocks.load.mockResolvedValue({ snapshot: { version: 'b'.repeat(64) } })
    await expect(applyContentPlan(actor, id)).rejects.toThrow('version conflict')
    expect(mocks.execute).not.toHaveBeenCalled()
    mocks.load.mockResolvedValue({ snapshot: { version: 'a'.repeat(64) } })
    mocks.execute.mockResolvedValue({ rows: [] })
    await expect(applyContentPlan(actor, id)).rejects.toThrow('Content conflict')
    expect(mocks.dirty).not.toHaveBeenCalled()
  })

  test('конкурентно уже применённый план трактуется как успешный повтор', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    mocks.execute.mockResolvedValue({ rows: [] })
    mocks.plan.mockResolvedValueOnce(row()).mockResolvedValueOnce(row({ status: 'applied' }))
    await expect(applyContentPlan(actor, id)).resolves.toEqual({ status: 'applied', planId: id })
  })

  test('ошибка refresh после commit не превращает apply в ошибку сохранения', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.dirty.mockRejectedValue(new Error('Queue unavailable'))
    await expect(applyContentPlan(actor, id)).resolves.toEqual({ status: 'applied', planId: id })
    expect(mocks.execute).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  test('SQL error не вызывает refresh и не притворяется успешным apply', async () => {
    const { applyContentPlan } = await import('~~/server/utils/contentApply')
    mocks.execute.mockRejectedValue(new Error('Audit write failed'))
    await expect(applyContentPlan(actor, id)).rejects.toThrow('Audit write failed')
    expect(mocks.dirty).not.toHaveBeenCalled()
  })
})
