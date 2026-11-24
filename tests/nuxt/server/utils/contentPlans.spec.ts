import { PgDialect } from 'drizzle-orm/pg-core'
import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import type { ContentActor } from '~~/server/utils/contentAuth'
import type { contentPlan } from '~~/server/db/schema'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
const load = vi.hoisted(() => vi.fn())
vi.mock('~~/server/db', async () => ({ db: (await import('~~/tests/helpers/fakeDb')).makeFakeDb(state) }))
vi.mock('~~/server/utils/contentRecords', async importOriginal => ({ ...await importOriginal<object>(), loadContent: load }))

const id = '11111111-1111-4111-8111-111111111111'
const actor: ContentActor = { id: `token:${id}`, tokenId: id, environment: 'development', resources: ['pages'], scopes: ['read', 'plan', 'apply'] }
const admin: ContentActor = { id: 'admin', tokenId: null, environment: 'development', resources: [], scopes: [] }
function row(overrides: Partial<typeof contentPlan.$inferSelect> = {}): typeof contentPlan.$inferSelect {
  return { id, environment: 'development', resource: 'pages', record_id: 1, actor: actor.id, token_id: id, version: 'a'.repeat(64), expected_state: {}, before: { ru: {}, en: {} }, after: { ru: {}, en: {} }, diff: [], status: 'pending', expires_at: new Date(Date.now() + 60000).toISOString(), approved_by: null, approved_at: null, applied_at: null, created_at: new Date().toISOString(), ...overrides }
}

beforeEach(() => {
  plan(state)
  load.mockReset()
  vi.stubEnv('CONTENT_ENVIRONMENT', 'development')
  vi.stubEnv('CONTENT_WRITE_ENABLED', 'true')
})
afterEach(() => vi.unstubAllEnvs())

describe('Планы изменения контента', () => {
  test('delta pages содержит отдельные текстовые поля, не locale map', async () => {
    const { contentDiff } = await import('~~/server/utils/contentPlans')
    expect(contentDiff('pages', { ru: { 'hero.line1': 'До' }, en: {} }, { ru: { 'hero.line1': 'После' }, en: {} })).toEqual([{ field: 'ru.hero.line1', before: 'До', after: 'После' }])
  })

  test('частичный pages patch сохраняет остальные defaults и второй язык', async () => {
    const { prepareContentAfter } = await import('~~/server/utils/contentPlans')
    const { PAGE_DEFAULTS } = await import('~~/shared/content/registry')
    const after = prepareContentAfter('pages', PAGE_DEFAULTS, { ru: { 'hero.line1': 'Текст' } })
    expect(after).toMatchObject({ ru: { 'hero.line1': 'Текст', 'hero.line2': PAGE_DEFAULTS.ru['hero.line2'] }, en: PAGE_DEFAULTS.en })
    expect(PAGE_DEFAULTS.ru['hero.line1']).not.toBe('Текст')
  })

  test('HTML post очищается до preview, plain поля не принимают HTML', async () => {
    const { prepareContentAfter } = await import('~~/server/utils/contentPlans')
    const before = { slug: 'test', type: 'blog', title_ru: 'Тест', title_en: '', text_ru: '', text_en: '', excerpt_ru: '', excerpt_en: '', url: null, published_at: null }
    const after = prepareContentAfter('post', before, { text_ru: '<p onclick="bad()">Хорошо</p><script>bad()</script>' })
    expect(after.text_ru).toBe('<p>Хорошо</p>')
    expect(() => prepareContentAfter('post', before, { title_ru: '<b>Название</b>' })).toThrow()
    expect(() => prepareContentAfter('post', before, { secret: 'no' })).toThrow()
  })

  test.each([101, 255])('изменение заголовка существующего post со slug длиной %i не блокируется', async (length) => {
    const { prepareContentAfter } = await import('~~/server/utils/contentPlans')
    const before = { slug: 'a'.repeat(length), type: 'blog', title_ru: 'До', title_en: '', text_ru: '', text_en: '', excerpt_ru: '', excerpt_en: '', url: null, published_at: null }
    expect(prepareContentAfter('post', before, { title_ru: 'После' })).toEqual({ ...before, title_ru: 'После' })
  })

  test('список планов выбирает только метаданные без снимков и diff', async () => {
    const { listContentPlans } = await import('~~/server/utils/contentPlans')
    const summary = { id, resource: 'pages', recordId: 1, expiresAt: row().expires_at, status: 'pending' }
    plan(state, { 'select:content_plan': [[summary]] })
    expect(await listContentPlans(admin)).toEqual([summary])
    expect(Object.keys(stepArg(state.calls, 'select:content_plan', 'select')!)).toEqual(['id', 'resource', 'recordId', 'expiresAt', 'status'])
    expect(stepArg(state.calls, 'select:content_plan', 'limit')).toBe(100)
    await expect(listContentPlans(actor)).rejects.toThrow('Admin approval')
  })

  test('полный план по ID доступен админу своей среды без внутренних CAS и credential полей', async () => {
    const { readContentPlan } = await import('~~/server/utils/contentPlans')
    plan(state, { 'select:content_plan': [[row({ expected_state: { private: true } })]] })
    const result = await readContentPlan(admin, id)
    expect(result).toMatchObject({ id, before: row().before, after: row().after, diff: [] })
    expect(result).not.toHaveProperty('expected_state')
    expect(result).not.toHaveProperty('token_id')
    const query = new PgDialect().sqlToQuery(stepArg(state.calls, 'select:content_plan', 'where')!)
    expect(query.params).toEqual([id, 'development'])
    plan(state)
    await expect(readContentPlan(admin, id)).rejects.toThrow('not found')
    await expect(readContentPlan(actor, id)).rejects.toThrow('Admin approval')
    expect(state.calls).toHaveLength(1)
  })

  test('создание сохраняет pending и actor на сервере, не меняет live', async () => {
    const { createContentPlan } = await import('~~/server/utils/contentPlans')
    const { PAGE_DEFAULTS } = await import('~~/shared/content/registry')
    load.mockResolvedValue({ snapshot: { version: 'a'.repeat(64), data: PAGE_DEFAULTS }, state: { raw: true } })
    plan(state, { 'insert:content_plan': [[row()]] })
    await createContentPlan(actor, { resource: 'pages', recordId: 1, expectedVersion: 'a'.repeat(64), patch: { ru: { 'hero.line1': 'Новая строка' } } })
    expect(state.calls).toHaveLength(1)
    expect(state.calls[0]).toMatchObject({ op: 'insert', table: 'content_plan' })
    expect(stepArg(state.calls, 'insert:content_plan', 'values')).toMatchObject({ actor: actor.id, token_id: id, environment: 'development', expected_state: { raw: true } })
  })

  test('конфликт и отсутствие изменений не создают план', async () => {
    const { createContentPlan } = await import('~~/server/utils/contentPlans')
    const { PAGE_DEFAULTS } = await import('~~/shared/content/registry')
    load.mockResolvedValue({ snapshot: { version: 'b'.repeat(64), data: PAGE_DEFAULTS }, state: {} })
    const input = { resource: 'pages', recordId: 1, expectedVersion: 'a'.repeat(64), patch: { ru: { 'hero.line1': 'Строка' } } } as const
    await expect(createContentPlan(actor, input)).rejects.toThrow('version conflict')
    await expect(createContentPlan(actor, { ...input, expectedVersion: 'b'.repeat(64), patch: { ru: { 'hero.line1': PAGE_DEFAULTS.ru['hero.line1'] } } })).rejects.toThrow('no changes')
    expect(state.calls).toHaveLength(0)
  })

  test('отказывает чужому токену и не возвращает внутренний CAS state', async () => {
    const { loadContentPlan, publicContentPlan } = await import('~~/server/utils/contentPlans')
    plan(state, { 'select:content_plan': [[row({ token_id: 'another' })]] })
    await expect(loadContentPlan(actor, id)).rejects.toThrow('another actor')
    expect(publicContentPlan(row())).not.toHaveProperty('expected_state')
    expect(publicContentPlan(row())).not.toHaveProperty('token_id')
  })

  test('approve не применяет live, истёкший план не подтверждается', async () => {
    const { approveContentPlan } = await import('~~/server/utils/contentPlans')
    plan(state, { 'select:content_plan': [[row()]], 'update:content_plan': [[row({ status: 'approved', approved_by: 'admin' })]] })
    expect((await approveContentPlan(admin, id)).status).toBe('approved')
    expect(state.calls.every(call => call.table === 'content_plan')).toBe(true)
    plan(state, { 'select:content_plan': [[row({ expires_at: '2000-01-01T00:00:00Z' })]] })
    await expect(approveContentPlan(admin, id)).rejects.toThrow('expired')
  })

  test('выключенная запись отсекается до загрузки snapshot', async () => {
    const { createContentPlan } = await import('~~/server/utils/contentPlans')
    vi.stubEnv('CONTENT_WRITE_ENABLED', 'false')
    await expect(createContentPlan(actor, { resource: 'pages', recordId: 1, expectedVersion: 'a'.repeat(64), patch: {} })).rejects.toThrow('disabled')
    expect(load).not.toHaveBeenCalled()
  })
})
