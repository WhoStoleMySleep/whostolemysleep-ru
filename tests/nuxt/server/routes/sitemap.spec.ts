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
  vi.stubGlobal('defineCachedEventHandler', (fn: unknown) => fn)
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
      { slug: 'kak-ya-pisal-bekend', type: 'blog',    url: null,                  updated_at: '2026-09-02T10:00:00.000Z' },
      { slug: 'publisher',           type: 'project', url: null,                  updated_at: '2026-08-15T10:00:00.000Z' },
      { slug: 'lives-elsewhere',     type: 'project', url: 'https://example.com', updated_at: '2026-08-01T10:00:00.000Z' },
    ]],
  })
})

describe('sitemap', () => {
  test('a project with no site of its own is listed — it has a page here', async () => {
    const xml = await sitemap()
    expect(xml).toContain('https://whostolemysleep.ru/ru/projects/publisher')
    expect(xml).toContain('https://whostolemysleep.ru/en/projects/publisher')
  })

  test('проект с внешним сайтом имеет собственный кейс в обеих локалях', async () => {
    const xml = await sitemap()
    expect(xml).toContain('/ru/projects/lives-elsewhere')
    expect(xml).toContain('/en/projects/lives-elsewhere')
  })

  test('blog posts are listed in both locales', async () => {
    const xml = await sitemap()
    expect(xml).toContain('/ru/blog/kak-ya-pisal-bekend')
    expect(xml).toContain('/en/blog/kak-ya-pisal-bekend')
  })

  test('every indexable static page is there', async () => {
    const xml = await sitemap()
    for (const path of ['', '/blog', '/projects', '/resume', '/contacts', '/privacy'])
      expect(xml).toContain(`<loc>https://whostolemysleep.ru/ru${path}</loc>`)
  })

  test('/cv stays out — routeRules serves it noindex', async () => {
    const xml = await sitemap()
    expect(xml).not.toContain('/cv</loc>')
  })

  test('a post carries lastmod, a static page does not — nothing here knows when its markup changed', async () => {
    const xml = await sitemap()
    expect(xml).toContain('<loc>https://whostolemysleep.ru/ru/blog/kak-ya-pisal-bekend</loc><lastmod>2026-09-02</lastmod>')
    expect(xml).toContain('<url><loc>https://whostolemysleep.ru/ru/resume</loc></url>')
  })

  test('only published posts are queried', async () => {
    await sitemap()
    const call = state.calls.find(c => c.table === 'post')
    expect(call?.steps.some(s => s.m === 'where')).toBe(true)
  })
})

test('без публикаций сохраняет порядок статических URL в обоих языках', async () => {
  plan(state)
  const xml = await sitemap()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
  expect(urls).toEqual(['', '/blog', '/projects', '/resume', '/contacts', '/privacy'].flatMap(path =>
    ['en', 'ru'].map(locale => `https://whostolemysleep.ru/${locale}${path}`)
  ))
  expect(xml).not.toContain('<lastmod>')
})

test('не добавляет lastmod при отсутствии даты, но сохраняет страницу статьи с внешним URL', async () => {
  plan(state, { 'select:post': [[{ slug: 'undated', type: 'blog', url: 'https://external.test', updated_at: null }]] })
  const xml = await sitemap()
  expect(xml).toContain('<url><loc>https://whostolemysleep.ru/en/blog/undated</loc></url>')
  expect(xml).not.toContain('<lastmod>')
})
