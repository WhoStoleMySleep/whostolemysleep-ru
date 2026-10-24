import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref } from 'vue'

const m = vi.hoisted(() => ({
  locale: { value: 'ru' },
  fetch:  vi.fn(),
}))

mockNuxtImport('useLocale', () => () => ({ locale: m.locale }))

/**
 * $fetch is mocked as an auto-import, not as a global. Since Nuxt 4.5 it arrives
 * through a generated `fetch.mjs` that captures `globalThis.$fetch` into a module
 * binding once, at evaluation time — so replacing the global afterwards, which is
 * what a test does, no longer reaches the code under test.
 */
mockNuxtImport('$fetch', () => m.fetch)

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
})

afterEach(() => {
  m.fetch.mockReset()
})

describe('opening and closing', () => {
  test('the first opening loads entries of both types', async () => {
    const s = await store()
    await s.open()

    expect(s.isOpen).toBe(true)
    expect(m.fetch).toHaveBeenCalledTimes(2)
  })

  test('two quick openings share one request', async () => {
    const s = await store()
    await Promise.all([s.open(), s.open()])

    expect(m.fetch).toHaveBeenCalledTimes(2)
  })

  test('a failed load is not remembered — the next opening tries again', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    m.fetch.mockRejectedValueOnce(new Error('offline'))
    const s = await store()

    await s.open()
    s.close()
    await s.open()
    await s.search('Rust')

    expect(error).toHaveBeenCalled()
    expect(s.results.map((p) => p.slug)).toContain('rust')
    error.mockRestore()
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

  test('a response for the previous language does not overwrite the new one', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    m.fetch.mockImplementation(async (url: string, opts: { query: { locale: string } }) => {
      if (opts.query.locale === 'ru') await gate
      const items = url.includes('project') ? projects : blog
      return items.map((p) => ({ ...p, title: `${p.title} ${opts.query.locale}` }))
    })

    const s = await store()
    const stale = s.open()
    m.locale.value = 'en'
    await nextTick()
    release()
    await stale
    await s.search('Rust')

    expect(s.results.map((p) => p.title)).toEqual(['Backend in Rust en'])
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
