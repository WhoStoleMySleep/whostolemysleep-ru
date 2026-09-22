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
  { id: 1, slug: 'rust', title: 'Backend in Rust', excerpt: 'about rust', tags: [{ name: 'Rust' }] },
  { id: 2, slug: 'vue',  title: 'Notes on Vue',   excerpt: 'about vue',  tags: [{ name: 'Vue' }] },
]
const projects = [
  { id: 3, slug: 'cli', title: 'A command-line tool', excerpt: 'cli', tags: [] },
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

describe('opening and closing', () => {
  test('the first opening loads entries of both types', async () => {
    const s = await store()
    await s.open()

    expect(s.isOpen).toBe(true)
    expect(m.fetch).toHaveBeenCalledTimes(2)
  })

  test('opening again does not hit the network a second time', async () => {
    const s = await store()
    await s.open()
    s.close()
    await s.open()

    expect(m.fetch).toHaveBeenCalledTimes(2)
  })

  test('closing clears the query and the results', async () => {
    const s = await store()
    await s.open()
    await s.search('Rust')
    s.close()

    expect(s.isOpen).toBe(false)
    expect(s.query).toBe('')
    expect(s.results).toEqual([])
  })
})

describe('search', () => {
  test('it finds by title across both posts and projects', async () => {
    const s = await store()
    await s.open()
    await s.search('Rust')

    expect(s.results.map((p) => p.slug)).toContain('rust')
  })

  test('it finds by tag name', async () => {
    const s = await store()
    await s.open()
    await s.search('Vue')

    expect(s.results.map((p) => p.slug)).toContain('vue')
  })

  test('an empty query resets the results', async () => {
    const s = await store()
    await s.open()
    await s.search('Rust')
    await s.search('   ')

    expect(s.results).toEqual([])
  })

  test('a stale result does not overwrite a fresher query', async () => {
    const s = await store()
    await s.open()

    const slow = s.search('Rust')
    await s.search('Vue')
    await slow

    expect(s.query).toBe('Vue')
    expect(s.results.map((p) => p.slug)).toContain('vue')
  })

  test('nothing found is an empty list, not every entry', async () => {
    const s = await store()
    await s.open()
    await s.search('quantum chromodynamics')

    expect(s.results).toEqual([])
  })
})

describe('switching language', () => {
  test('an open search reloads the entries in the new language', async () => {
    const s = await store()
    await s.open()
    m.fetch.mockClear()

    m.locale.value = 'en'
    await nextTick()
    await nextTick()

    expect(m.fetch).toHaveBeenCalledTimes(2)
    expect(m.fetch.mock.calls[0]?.[1]).toMatchObject({ query: { locale: 'en' } })
  })

  test('a closed search waits to be opened instead of loading for nothing', async () => {
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
