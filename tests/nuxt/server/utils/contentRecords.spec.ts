import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import { plan } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted(() => ({ results: {}, calls: [], cursor: {} }) as FakeDbState)
const execute = vi.hoisted(() => vi.fn())
vi.mock('~~/server/db', () => ({ db: { execute } }))
beforeEach(() => { plan(state); execute.mockReset() })

describe('Чтение публичного контента и snapshots', () => {
  test('версия не зависит от порядка ключей и меняется при любой правке строки', async () => {
    const { contentVersion } = await import('~~/server/utils/contentRecords')
    expect(contentVersion({ a: 1, b: 2 }, { x: 'a' })).toBe(contentVersion({ b: 2, a: 1 }, { x: 'a' }))
    expect(contentVersion({ a: 1 }, {})).not.toBe(contentVersion({ a: 2 }, {}))
    expect(contentVersion({}, { title: 'a' })).not.toBe(contentVersion({}, { title: 'b' }))
  })

  test('effective page values объединяют defaults без мутации', async () => {
    const { effectivePageCopy } = await import('~~/server/utils/contentRecords')
    const { PAGE_DEFAULTS } = await import('~~/shared/content/registry')
    const override = { ru: { 'hero.line1': 'Новый текст' }, en: {} }
    const effective = effectivePageCopy(override)
    expect(effective.ru['hero.line1']).toBe('Новый текст')
    expect(effective.en).toEqual(PAGE_DEFAULTS.en)
    expect(override.ru).toEqual({ 'hero.line1': 'Новый текст' })
    expect(PAGE_DEFAULTS.ru['hero.line1']).not.toBe('Новый текст')
  })

  test('отсутствие строки возвращает empty maps без записи', async () => {
    const { readPublicPageContent } = await import('~~/server/utils/contentRecords')
    execute.mockResolvedValue({ rows: [] })
    await expect(readPublicPageContent('development')).resolves.toEqual({ ru: {}, en: {} })
    expect(execute).toHaveBeenCalledTimes(1)
  })

  test('fallback только для 42P01 именно page_content', async () => {
    const { readPublicPageContent, isMissingPageContentTable } = await import('~~/server/utils/contentRecords')
    const absent = { code: '42P01', message: 'relation "page_content" does not exist' }
    execute.mockRejectedValue(absent)
    await expect(readPublicPageContent('development')).resolves.toEqual({ ru: {}, en: {} })
    expect(isMissingPageContentTable({ cause: absent })).toBe(true)
    expect(isMissingPageContentTable({ code: '42P01', message: 'relation "post" does not exist' })).toBe(false)
    expect(isMissingPageContentTable({ code: '42501', table: 'page_content' })).toBe(false)
    execute.mockRejectedValue({ code: '08006', message: 'Connection failure' })
    await expect(readPublicPageContent('development')).rejects.toMatchObject({ code: '08006' })
  })

  test('данные БД проходят ту же allowlist схему', async () => {
    const { readPublicPageContent } = await import('~~/server/utils/contentRecords')
    execute.mockResolvedValue({ rows: [{ data: { ru: { 'hero.line1': '<img>' }, en: {} } }] })
    await expect(readPublicPageContent('development')).rejects.toThrow('Invalid content input')
  })

  test('pages snapshot использует effective values и хранит raw CAS отдельно', async () => {
    const { loadContent } = await import('~~/server/utils/contentRecords')
    const raw = { environment: 'development', data: { ru: { 'hero.line1': 'Свой текст' }, en: {} }, updated_at: '2026-01-01T00:00:00Z' }
    execute.mockResolvedValue({ rows: [{ state: raw }] })
    const loaded = await loadContent('pages', 1, 'development')
    expect(loaded.state).toEqual(raw)
    expect(loaded.snapshot.data).toMatchObject({ ru: { 'hero.line1': 'Свой текст' } })
    expect(loaded.snapshot.version).toMatch(/^[a-f0-9]{64}$/)
    await expect(loadContent('pages', 2, 'development')).rejects.toThrow('not found')
  })

  test('post snapshot не раскрывает external_id и служебные поля', async () => {
    const { loadContent } = await import('~~/server/utils/contentRecords')
    execute.mockResolvedValue({ rows: [{ state: { id: 1, external_id: 'private-publish', is_published: true, created_at: 'private', slug: 'test', title_ru: 'Текст', published_at: '2026-01-01 00:00:00' } }] })
    const { snapshot } = await loadContent('post', 1, 'development')
    expect(snapshot.data).not.toHaveProperty('external_id')
    expect(snapshot.data).not.toHaveProperty('is_published')
    expect(snapshot.data.published_at).toBe('2026-01-01T00:00:00.000Z')
  })

  test('минимальный выбор pages не обращается к БД', async () => {
    const { listContentRecords } = await import('~~/server/utils/contentRecords')
    expect(await listContentRecords('pages')).toEqual([{ id: 1, label: 'Page copy / RU + EN' }])
    expect(execute).not.toHaveBeenCalled()
    execute.mockResolvedValue({ rows: [{ id: 1, label: 'Название' }] })
    expect(await listContentRecords('post')).toEqual([{ id: 1, label: 'Название' }])
  })
})
