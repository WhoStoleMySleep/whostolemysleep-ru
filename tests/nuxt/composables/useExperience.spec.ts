import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

const state = vi.hoisted(() => ({ locale: { value: 'ru' as 'ru' | 'en' } }))
mockNuxtImport('useLocale', () => () => ({ locale: computed(() => state.locale.value) }))

beforeEach(() => {
  state.locale = ref<'ru' | 'en'>('ru')
  useState('experience-today').value = '2026-11-22'
})

describe('useExperience', () => {
  test('обновляет общий стаж и длительности при изменении данных и языка', async () => {
    const { useExperience } = await import('~/composables/useExperience')
    const periods = ref([{ date_from: '2024-01-01', date_to: '2025-02-28' as string | null }])
    const result = useExperience(periods)
    expect(result.total.value).toBe('1 год 2 месяца')
    expect(result.duration(periods.value[0]!)).toBe('1 год 2 месяца')
    state.locale.value = 'en'
    expect(result.total.value).toBe('1 year 2 months')
    periods.value = [{ date_from: '2025-11-23', date_to: null }]
    expect(result.total.value).toBe('1 year')
  })

  test('использует SSR-дату, а не часы клиента, и переносит пустые данные', async () => {
    const { useExperience } = await import('~/composables/useExperience')
    const periods = ref<null | { date_from: string; date_to: null }[]>(null)
    const result = useExperience(periods)
    expect(result.total.value).toBe('менее месяца')
    periods.value = [{ date_from: '2025-11-23', date_to: null }]
    expect(result.total.value).toBe('1 год')
  })
})
