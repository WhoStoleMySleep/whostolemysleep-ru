import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

async function sitemap() {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('setHeader', () => {})
  const mod = await import('~~/server/routes/sitemap.xml')
  return (mod.default as (e: H3Event) => Promise<string>)({} as H3Event)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  plan(state, {
    'select:post': [[
      { slug: 'kak-ya-pisal-bekend',  type: 'blog',    url: null },
      { slug: 'publisher',            type: 'project',  url: null },
      { slug: 'lives-elsewhere',      type: 'project',  url: 'https://example.com' },
    ]],
  })
})

describe('sitemap', () => {
  test('a project with no site of its own is listed — it has a page here', async () => {
    const xml = await sitemap()
    expect(xml).toContain('https://whostolemysleep.ru/ru/blog/publisher')
    expect(xml).toContain('https://whostolemysleep.ru/en/blog/publisher')
  })

  test('a project that links out is not listed — the page belongs to the other site', async () => {
    const xml = await sitemap()
    expect(xml).not.toContain('lives-elsewhere')
  })

  test('blog posts are listed in both locales', async () => {
    const xml = await sitemap()
    expect(xml).toContain('/ru/blog/kak-ya-pisal-bekend')
    expect(xml).toContain('/en/blog/kak-ya-pisal-bekend')
  })

  test('every static page is there, /cv included', async () => {
    const xml = await sitemap()
    for (const path of ['', '/blog', '/projects', '/resume', '/cv', '/contacts', '/privacy'])
      expect(xml).toContain(`<loc>https://whostolemysleep.ru/ru${path}</loc>`)
  })

  test('only published posts are queried', async () => {
    await sitemap()
    const call = state.calls.find(c => c.table === 'post')
    expect(call?.steps.some(s => s.m === 'where')).toBe(true)
  })
})
