import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref } from 'vue'
import type { Ref } from 'vue'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), states: new Map<string, Ref<unknown>>(), locale: null as unknown as Ref<string>,
  translated: vi.fn((key: string, params: Record<string, unknown>) => `${key}:${params.years ?? ''}`),
}))
mockNuxtImport('$fetch', () => mocks.fetch)
mockNuxtImport('useState', () => (key: string, init: () => unknown) => {
  if (!mocks.states.has(key)) mocks.states.set(key, ref(init()))
  return mocks.states.get(key)
})
mockNuxtImport('useAsyncData', () => async (_key: string, handler: () => Promise<unknown>) => ({ data: ref(await handler()) }))
mockNuxtImport('useI18n', () => () => ({ locale: mocks.locale, t: mocks.translated }))
mockNuxtImport('useSwitchLocalePath', () => () => (locale: string) => `/${locale}`)

beforeEach(() => {
  mocks.states = new Map()
  mocks.locale = ref('ru')
  mocks.fetch.mockReset().mockResolvedValue({ ru: {}, en: {} })
  mocks.translated.mockClear()
})

async function pageCopy() {
  const { usePageCopy } = await import('~/composables/usePageCopy')
  return usePageCopy()
}

async function locale() {
  const { useLocale } = await import('~/composables/useLocale')
  return useLocale()
}

describe('Page-copy публичных страниц', () => {
  test.each([null, undefined, { ru: null }, { ru: [], en: 'invalid' }])('при неполном ответе %j остаются исходные переводы', async (response) => {
    mocks.fetch.mockResolvedValue(response)
    const copy = await pageCopy()
    await copy.load()
    expect(copy.text('hero.line1', 'ru')).toBeNull()
    expect((await locale()).t('hero.line1')).toBe('hero.line1:')
  })

  test('ошибка API или отсутствующая миграция не блокирует сайт', async () => {
    mocks.fetch.mockRejectedValue({ statusCode: 500 })
    const copy = await pageCopy()
    await expect(copy.load()).resolves.toBeUndefined()
    expect(copy.overrides.value).toEqual({ ru: {}, en: {} })
    expect(mocks.fetch).toHaveBeenCalledWith('/api/page-content', { timeout: 1500 })
  })

  test('поздний override обновляет уже созданный t и computed, включая SEO', async () => {
    const copy = await pageCopy()
    const { t } = await locale()
    const heading = computed(() => t('hero.line1'))
    const seo = computed(() => t('seo.home_title'))
    expect(heading.value).toBe('hero.line1:')
    mocks.fetch.mockResolvedValue({ ru: { 'hero.line1': 'Привет', 'seo.home_title': 'Мой сайт' }, en: {} })
    await copy.load()
    expect(heading.value).toBe('Привет')
    expect(seo.value).toBe('Мой сайт')
    mocks.fetch.mockResolvedValue({ ru: {}, en: {} })
    await copy.load()
    expect(heading.value).toBe('hero.line1:')
  })

  test('переключение RU/EN не держит устаревшую копию и сохраняет params', async () => {
    mocks.fetch.mockResolvedValue({ ru: { 'hero.lede': 'Опыт {years}' }, en: { 'hero.lede': 'Experience {years}' } })
    await (await pageCopy()).load()
    const { t } = await locale()
    const lede = computed(() => t('hero.lede', { years: '5 лет' }))
    expect(lede.value).toBe('Опыт 5 лет')
    mocks.locale.value = 'en'
    expect(lede.value).toBe('Experience 5 лет')
    expect(t('search.empty', { q: 'Nuxt' })).toBe('search.empty:')
    expect(mocks.translated).toHaveBeenLastCalledWith('search.empty', { q: 'Nuxt' })
  })

  test('данные одного SSR request не переходят в следующий request', async () => {
    mocks.fetch.mockResolvedValue({ ru: { 'hero.line1': 'Первый запрос' }, en: {} })
    const first = await pageCopy()
    await first.load()
    mocks.states = new Map()
    const second = await pageCopy()
    expect(second.text('hero.line1', 'ru')).toBeNull()
    mocks.fetch.mockResolvedValue({ ru: { 'hero.line1': 'Второй запрос' }, en: {} })
    await second.load()
    expect(first.text('hero.line1', 'ru')).toBe('Первый запрос')
    expect(second.text('hero.line1', 'ru')).toBe('Второй запрос')
  })

  test('системные ключи, HTML, неизвестные параметры и слишком длинные строки игнорируются', async () => {
    mocks.fetch.mockResolvedValue({ ru: {
      'nav.home': 'Не менять', 'privacy.title': 'Не менять', 'contacts.err_name': 'Не менять',
      'hero.line1': '<strong>HTML</strong>', 'hero.line2': '{unsafe}', 'hero.lede': 'Без стажа',
      'cv.name': 'x'.repeat(501), 'footer.dev': '',
    }, en: {} })
    const copy = await pageCopy()
    await copy.load()
    expect(copy.overrides.value.ru).toEqual({ 'footer.dev': '' })
    expect(copy.text('footer.dev', 'ru')).toBe('')
    expect(copy.text('hero.line1', 'ru')).toBeNull()
  })

  test('ровно допустимый лимит сохраняется, параметры не исполняют i18n-инструкции', async () => {
    mocks.fetch.mockResolvedValue({ ru: { 'cv.name': 'x'.repeat(500), 'hero.lede': 'Опыт {years} @:cv.name' }, en: {} })
    const copy = await pageCopy()
    await copy.load()
    expect(copy.text('cv.name', 'ru')).toHaveLength(500)
    expect(copy.text('hero.lede', 'ru', { years: '$&' })).toBe('Опыт $& @:cv.name')
  })
})
