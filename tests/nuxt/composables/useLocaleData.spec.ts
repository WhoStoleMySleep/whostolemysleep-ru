import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

const m = vi.hoisted(() => ({
  locale: { value: 'ru' },
  fetch:  vi.fn(async () => ({ ok: true })),
  calls:  [] as { key: () => string, handler: () => unknown, opts: unknown }[],
}))

mockNuxtImport('useLocale', () => () => ({ locale: m.locale }))
mockNuxtImport('$fetch', () => m.fetch)
mockNuxtImport('useAsyncData', () => (key: () => string, handler: () => unknown, opts: unknown) => {
  m.calls.push({ key, handler, opts })
  return {}
})

beforeEach(() => {
  m.locale = ref('ru') as unknown as { value: string }
  m.fetch.mockClear()
  m.calls = []
})

describe('useLocaleData', () => {
  test('the key carries the endpoint and the language — two locales never share a cache entry', async () => {
    const { useLocaleData } = await import('~/composables/useLocaleData')
    useLocaleData('/api/about')
    const { key } = m.calls[0]!

    expect(key()).toBe('/api/about-ru')
    m.locale.value = 'en'
    expect(key()).toBe('/api/about-en')
  })

  test('the request asks for the current language', async () => {
    const { useLocaleData } = await import('~/composables/useLocaleData')
    useLocaleData('/api/skills')
    m.locale.value = 'en'
    await m.calls[0]!.handler()

    expect(m.fetch).toHaveBeenCalledWith('/api/skills', { query: { locale: 'en' } })
  })

  test('lazy is passed through, and is off unless asked for', async () => {
    const { useLocaleData } = await import('~/composables/useLocaleData')
    useLocaleData('/api/a', { lazy: true })
    useLocaleData('/api/b')

    expect(m.calls[0]!.opts).toEqual({ lazy: true })
    expect(m.calls[1]!.opts).toEqual({ lazy: undefined })
  })
})
