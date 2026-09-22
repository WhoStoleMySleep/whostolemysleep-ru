import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'

const m = vi.hoisted(() => ({
  locale: { value: 'ru' },
  fetch:  vi.fn(),
}))

mockNuxtImport('useLocale', () => () => ({ locale: m.locale }))

const blog = [
  { id: 1, slug: 'rust', title: 'Бэкенд на Rust', excerpt: 'про раст', tags: [{ name: 'Rust' }] },
  { id: 2, slug: 'vue',  title: 'Заметки о Vue',  excerpt: 'про vue',  tags: [{ name: 'Vue' }] },
]
const projects = [
  { id: 3, slug: 'cli', title: 'Консольная утилита', excerpt: 'cli', tags: [] },
]

async function store() {
  const { useSearchStore } = await import('~/stores/search')
  return useSearchStore()
}

beforeEach(() => {
  setActivePinia(createPinia())
  m.locale = ref('ru') as unknown as { value: string }
  m.fetch.mockImplementation(async (url: string) => (url.includes('project') ? projects : blog))
  vi.stubGlobal('$fetch', m.fetch)
})

afterEach(() => {
  vi.unstubAllGlobals()
  m.fetch.mockReset()
})

describe('открытие и закрытие', () => {
  test('первое открытие грузит записи обоих типов', async () => {
    const s = await store()
    await s.open()

    expect(s.isOpen).toBe(true)
    expect(m.fetch).toHaveBeenCalledTimes(2)
  })

  test('повторное открытие не ходит в сеть заново', async () => {
    const s = await store()
    await s.open()
    s.close()
    await s.open()

    expect(m.fetch).toHaveBeenCalledTimes(2)
  })

  test('закрытие чистит запрос и результаты', async () => {
    const s = await store()
    await s.open()
    await s.search('Rust')
    s.close()

    expect(s.isOpen).toBe(false)
    expect(s.query).toBe('')
    expect(s.results).toEqual([])
  })
})

describe('поиск', () => {
  test('находит по заголовку среди статей и проектов', async () => {
    const s = await store()
    await s.open()
    await s.search('Rust')

    expect(s.results.map((p) => p.slug)).toContain('rust')
  })

  test('находит по названию тега', async () => {
    const s = await store()
    await s.open()
    await s.search('Vue')

    expect(s.results.map((p) => p.slug)).toContain('vue')
  })

  test('пустой запрос сбрасывает результаты', async () => {
    const s = await store()
    await s.open()
    await s.search('Rust')
    await s.search('   ')

    expect(s.results).toEqual([])
  })

  test('устаревший результат не перетирает свежий запрос', async () => {
    const s = await store()
    await s.open()

    const slow = s.search('Rust')
    await s.search('Vue')
    await slow

    expect(s.query).toBe('Vue')
    expect(s.results.map((p) => p.slug)).toContain('vue')
  })

  test('ничего не найдено — пустой список, а не все записи', async () => {
    const s = await store()
    await s.open()
    await s.search('квантовая хромодинамика')

    expect(s.results).toEqual([])
  })
})

describe('смена языка', () => {
  test('открытый поиск перезагружает записи на новом языке', async () => {
    const s = await store()
    await s.open()
    m.fetch.mockClear()

    m.locale.value = 'en'
    await nextTick()
    await nextTick()

    expect(m.fetch).toHaveBeenCalledTimes(2)
    expect(m.fetch.mock.calls[0]?.[1]).toMatchObject({ query: { locale: 'en' } })
  })

  test('закрытый поиск ждёт открытия, а не грузит впустую', async () => {
    const s = await store()
    await s.open()
    s.close()
    m.fetch.mockClear()

    m.locale.value = 'en'
    await nextTick()
    await nextTick()

    expect(m.fetch).not.toHaveBeenCalled()
  })
})
