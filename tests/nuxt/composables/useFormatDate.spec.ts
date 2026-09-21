import { describe, test, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const state = vi.hoisted(() => ({ locale: 'ru' }))

mockNuxtImport('useLocale', () => () => ({
  locale: computed(() => state.locale),
  t:      (key: string) => (key === 'resume.present' ? 'по настоящее время' : key),
}))

describe('useFormatDate.format', () => {
  test('русская локаль — день.месяц.год', async () => {
    state.locale = 'ru'
    const { useFormatDate } = await import('~/composables/useFormatDate')
    expect(useFormatDate().format('2024-02-09')).toBe('09.02.2024')
  })

  test('английская локаль — месяц/день/год', async () => {
    state.locale = 'en'
    const { useFormatDate } = await import('~/composables/useFormatDate')
    expect(useFormatDate().format('2024-02-09')).toBe('02/09/2024')
  })

  test('объект Date принимается наравне со строкой', async () => {
    state.locale = 'ru'
    const { useFormatDate } = await import('~/composables/useFormatDate')
    expect(useFormatDate().format(new Date('2024-02-09T00:00:00Z'))).toBe('09.02.2024')
  })
})

describe('useFormatDate.formatPeriod', () => {
  test('незакрытый период подписывается словами, а не пустым концом', async () => {
    state.locale = 'ru'
    const { useFormatDate } = await import('~/composables/useFormatDate')
    expect(useFormatDate().formatPeriod('2020-03-01', null)).toBe('март 2020 г. — по настоящее время')
  })

  test('закрытый период показывает обе границы', async () => {
    state.locale = 'en'
    const { useFormatDate } = await import('~/composables/useFormatDate')
    expect(useFormatDate().formatPeriod('2020-03-01', '2021-07-01')).toBe('Mar 2020 — Jul 2021')
  })
})
