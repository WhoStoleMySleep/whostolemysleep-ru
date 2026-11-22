import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'

const state = vi.hoisted(() => ({ locale: 'ru' as 'ru' | 'en' }))
mockNuxtImport('useLocale', () => () => ({ locale: computed(() => state.locale), t: (key: string) => key }))
mockNuxtImport('useLocalePath', () => () => (path: string) => `/ru${path}`)
mockNuxtImport('useSettings', () => async () => ({ data: ref({ years_experience: 2 }) }))
mockNuxtImport('useLocaleData', () => async (url: string) => ({
  data: ref(url === '/api/resume/experience' ? [
    { id: 1, company: 'Company', position: 'Developer', date_from: '2024-01-01', date_to: '2025-02-28', bullets: [] },
    { id: 2, company: 'Other', position: 'Engineer', date_from: '2024-06-01', date_to: '2025-02-28', bullets: [] },
  ] : null),
}))

beforeEach(() => { useState('experience-today').value = '2026-11-22' })

describe('Стаж на страницах резюме и печатного CV', () => {
  test.each([
    ['resume', 'ru', '1 год 2 месяца'], ['resume', 'en', '1 year 2 months'],
    ['cv', 'ru', '1 год 2 месяца'], ['cv', 'en', '1 year 2 months'],
  ] as const)('%s в локали %s показывает общий стаж без двойного учёта', async (page, locale, expected) => {
    state.locale = locale
    const { default: Page } = page === 'cv' ? await import('~/pages/cv.vue') : await import('~/pages/resume/index.vue')
    const wrapper = await mountSuspended(Page)
    expect(wrapper.text()).toContain(`${page === 'cv' ? 'cv' : 'resume'}.experience · ${expected}`)
    expect(wrapper.text()).toContain(locale === 'ru' ? '9 месяцев' : '9 months')
    wrapper.unmount()
  })
})
