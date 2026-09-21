import { describe, test, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const state = vi.hoisted(() => ({ locale: 'ru' }))

mockNuxtImport('useI18n', () => () => ({
  locale: computed(() => state.locale),
  t:      (key: string) => key,
}))

mockNuxtImport('useSwitchLocalePath', () => () => (l: string) => `/${l}`)

describe('postCount по-русски', () => {
  test('единственное число', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(1)).toBe('1 запись')
    expect(useLocale().postCount(21)).toBe('21 запись')
  })

  test('от двух до четырёх', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(3)).toBe('3 записи')
    expect(useLocale().postCount(102)).toBe('102 записи')
  })

  test('множественное число', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(5)).toBe('5 записей')
    expect(useLocale().postCount(0)).toBe('0 записей')
  })

  test('второй десяток — исключение из правила для 1..4', async () => {
    state.locale = 'ru'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(11)).toBe('11 записей')
    expect(useLocale().postCount(14)).toBe('14 записей')
    expect(useLocale().postCount(111)).toBe('111 записей')
  })
})

describe('postCount по-английски', () => {
  test('единственное только для одной записи', async () => {
    state.locale = 'en'
    const { useLocale } = await import('~/composables/useLocale')
    expect(useLocale().postCount(1)).toBe('1 post')
    expect(useLocale().postCount(0)).toBe('0 posts')
    expect(useLocale().postCount(21)).toBe('21 posts')
  })
})
