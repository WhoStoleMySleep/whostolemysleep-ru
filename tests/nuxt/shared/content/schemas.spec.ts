import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'

const validPost = { slug: 'example', type: 'blog', title_ru: 'Текст', title_en: '', text_ru: '<p>Текст</p>', text_en: '', excerpt_ru: '', excerpt_en: '', url: null, published_at: null }

describe('Строгие схемы редакционного контента', () => {
  test('defaults сохраняют тексты локалей и проходят runtime-схему', async () => {
    const { PAGE_DEFAULTS, PAGE_FIELDS } = await import('~~/shared/content/registry')
    const { pageCopySchema } = await import('~~/shared/content/schemas')
    const ru = JSON.parse(readFileSync(`${process.cwd()}/i18n/locales/ru.json`, 'utf8'))
    expect(pageCopySchema.safeParse(PAGE_DEFAULTS).success).toBe(true)
    expect(PAGE_DEFAULTS.ru['hero.lede']).toBe(ru.hero.lede)
    expect(new Set(PAGE_FIELDS.map(field => field.key)).size).toBe(PAGE_FIELDS.length)
    expect(PAGE_FIELDS.some(field => /privacy|err_|consent|password/.test(field.key))).toBe(false)
  })

  test.each([
    { ru: { 'contacts.err_name': 'Ошибка' } }, { ru: { 'hero.line1': 42 } },
    { ru: { 'hero.line1': '<b>Текст</b>' } }, { ru: { 'hero.line1': '&lt;b&gt;' } },
    { ru: { 'hero.lede': 'Без стажа' } }, { ru: { 'hero.lede': '{years} {other}' } },
    { ru: { 'hero.lede': '{years} {years}' } }, { ru: { 'hero.line1': '{years}' } },
    { ru: { 'hero.line1': 'x'.repeat(501) } }, { fr: { 'hero.line1': 'Текст' } },
    { ru: {} }, {}, [], null,
  ])('отвергает неизвестные поля, HTML, неверные длины и placeholders: %j', async patch => {
    const { pagePatchSchema } = await import('~~/shared/content/schemas')
    expect(pagePatchSchema.safeParse(patch).success).toBe(false)
  })

  test('принимает точный placeholder и границу длины', async () => {
    const { pagePatchSchema } = await import('~~/shared/content/schemas')
    expect(pagePatchSchema.safeParse({ ru: { 'hero.lede': 'Опыт {years}', 'hero.line1': 'x'.repeat(500) } }).success).toBe(true)
  })

  test.each([
    ['post', { ...validPost, is_published: true }], ['post', { ...validPost, title_ru: 1 }],
    ['post', { ...validPost, type: 'secret' }], ['post', { ...validPost, url: 'javascript:alert(1)' }],
    ['post', { ...validPost, url: 'https://user:pass@example.com' }], ['post', { ...validPost, published_at: 'tomorrow' }],
    ['experience', { company_ru: 'A', company_en: '', position_ru: 'B', position_en: '', date_from: '2025-02-29', date_to: null, order: 0 }],
    ['education', { institution: 'A', specialization_ru: 'B', specialization_en: '', date_from: '2025-05-01', date_to: '2024-01-01', order: 0 }],
    ['settings', { open_to_work: 'true', show_search: true, github_url: '', telegram_url: '', email: '' }],
    ['skill', { name: '<script>x</script>', order: 0 }], ['skill', { name: 'TS', order: 0, group_id: 99 }],
    ['skill-group', { slug: 'not valid', name_ru: 'A', name_en: '', order: 0 }],
  ] as const)('ресурс %s отвергает недопустимые данные', async (resource, data) => {
    const { contentRecordSchema } = await import('~~/shared/content/schemas')
    expect(contentRecordSchema(resource).safeParse(data).success).toBe(false)
  })

  test('валидирует частичный patch без неявного coercion и пустых изменений', async () => {
    const { contentPatchSchema } = await import('~~/shared/content/schemas')
    expect(contentPatchSchema('post').safeParse({ title_ru: 'Название' }).success).toBe(true)
    expect(contentPatchSchema('post').safeParse({}).success).toBe(false)
    expect(contentPatchSchema('settings').safeParse({ open_to_work: 1 }).success).toBe(false)
    expect(contentPatchSchema('experience').safeParse({ bullets: [] }).success).toBe(false)
  })

  test('не принимает approve scope, actor из payload и лишние ключи запросов', async () => {
    const { contentTokenSchema, contentPlanSchema, contentPlanIdSchema } = await import('~~/shared/content/schemas')
    expect(contentTokenSchema.safeParse({ label: 'MCP', resources: ['pages'], scopes: ['approve'], expiresInDays: 1 }).success).toBe(false)
    expect(contentTokenSchema.safeParse({ label: 'MCP', resources: ['pages', 'pages'], scopes: ['read'], expiresInDays: 1 }).success).toBe(false)
    expect(contentTokenSchema.safeParse({ label: 'MCP', resources: ['pages'], scopes: ['read'], expiresInDays: 91 }).success).toBe(false)
    expect(contentPlanSchema.safeParse({ resource: 'pages', recordId: 1, expectedVersion: 'a'.repeat(64), patch: {}, actor: 'admin' }).success).toBe(false)
    expect(contentPlanIdSchema.safeParse({ planId: '11111111-1111-4111-8111-111111111111', approved: true }).success).toBe(false)
  })
})
