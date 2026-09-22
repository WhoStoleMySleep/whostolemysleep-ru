import { describe, test, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const state = vi.hoisted(() => ({ locale: 'ru' }))

mockNuxtImport('useI18n', () => () => ({
  locale: computed(() => state.locale),
  t:      (key: string) => key,
}))

mockNuxtImport('useSwitchLocalePath', () => () => (l: string) => `/${l}`)

describe('postCount in Russian', () => {
  test('singular', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(1)).toBe('1 запись')
    expect(useLocale().postCount(21)).toBe('21 запись')
  })

  test('two to four', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(3)).toBe('3 записи')
    expect(useLocale().postCount(102)).toBe('102 записи')
  })

  test('plural', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(5)).toBe('5 записей')
    expect(useLocale().postCount(0)).toBe('0 записей')
  })

  test('the teens are the exception to the 1..4 rule', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(11)).toBe('11 записей')
    expect(useLocale().postCount(14)).toBe('14 записей')
    expect(useLocale().postCount(111)).toBe('111 записей')
  })
})

describe('postCount in English', () => {
  test('singular only for a single entry', async () => {
    state.locale = 'en'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(1)).toBe('1 post')
    expect(useLocale().postCount(0)).toBe('0 posts')
    expect(useLocale().postCount(21)).toBe('21 posts')
  })
})
