import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'

const mocks = vi.hoisted(() => ({
  locale: null as unknown as Ref<string>, copy: null as unknown as Ref<unknown>,
  seo: null as unknown as { title: () => string, description: () => string },
}))
mockNuxtImport('useI18n', () => () => ({ locale: mocks.locale, t: (key: string) => `base:${key}` }))
mockNuxtImport('useSwitchLocalePath', () => () => (locale: string) => `/${locale}`)
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)
mockNuxtImport('useState', () => () => mocks.copy)
mockNuxtImport('useSettings', () => async () => ({ data: ref({ years_experience: 5, open_to_work: true }) }))
mockNuxtImport('useLocaleData', () => async (url: string) => ({ data: ref(url === '/api/posts/latest' ? [] : null) }))
mockNuxtImport('useSeoMeta', () => (value: typeof mocks.seo) => { mocks.seo = value })

beforeEach(() => {
  mocks.locale = ref('ru')
  mocks.copy = ref({ ru: {}, en: {} })
})

describe('Применение page-copy в публичных consumers', () => {
  test('герой и SEO реагируют на override без HTML, при этом оформление стажа остаётся', async () => {
    const { default: Home } = await import('~/pages/index.vue')
    const wrapper = await mountSuspended(Home)
    expect(wrapper.get('.hero__title').text()).toContain('base:hero.line1')
    expect(mocks.seo.title()).toBe('base:seo.home_title')
    mocks.copy.value = { ru: {
      'hero.line1': 'Моя главная', 'hero.lede': 'Опыт {years}. Остальной текст.',
      'seo.home_title': 'Редактируемый title', 'seo.home_desc': 'Редактируемое описание',
    }, en: { 'hero.line1': 'My home', 'hero.lede': 'Experience {years}.', 'seo.home_title': 'Edited title', 'seo.home_desc': 'Edited description' } }
    await nextTick()
    expect(wrapper.get('.hero__title').text()).toContain('Моя главная')
    expect(wrapper.get('.hero__lede').text()).toBe('Опыт 5+ base:hero.years. Остальной текст.')
    expect(wrapper.get('.hero__years').text()).toBe('5+ base:hero.years')
    expect(mocks.seo.title()).toBe('Редактируемый title')
    expect(mocks.seo.description()).toBe('Редактируемое описание')
    mocks.locale.value = 'en'
    await nextTick()
    expect(wrapper.get('.hero__title').text()).toContain('My home')
    expect(mocks.seo.title()).toBe('Edited title')
    expect(mocks.seo.description()).toBe('Edited description')
    wrapper.unmount()
  })

  test('подвал использует runtime override и fallback без изменения системных ссылок', async () => {
    const { default: Footer } = await import('~/components/App/AppFooter.vue')
    const wrapper = await mountSuspended(Footer)
    expect(wrapper.text()).toContain('base:footer.dev')
    mocks.copy.value = { ru: { 'footer.dev': 'Frontend и не только' }, en: {} }
    await nextTick()
    expect(wrapper.text()).toContain('Frontend и не только')
    mocks.locale.value = 'en'
    await nextTick()
    expect(wrapper.text()).toContain('base:footer.dev')
    expect(wrapper.text()).toContain('base:nav.privacy')
    wrapper.unmount()
  })
})
