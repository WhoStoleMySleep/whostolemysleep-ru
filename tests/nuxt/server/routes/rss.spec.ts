import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {}, rows: {} }))

vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

async function feed(locale: string) {
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineCachedEventHandler', (fn: unknown) => fn)
  vi.stubGlobal('getRouterParam', () => locale)
  vi.stubGlobal('setHeader', () => {})
  vi.stubGlobal('createError', (e: { statusCode: number, message: string }) =>
    Object.assign(new Error(e.message), e))
  const mod = await import('~~/server/routes/[locale]/rss.xml')
  return (mod.default as (e: H3Event) => Promise<string>)({} as H3Event)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  plan(state, {
    'select:post': [[
      {
        slug: 'rust-backend', title_ru: 'Бэкенд на Rust', title_en: 'A backend in Rust',
        text_ru: '<p>Текст</p>', text_en: '<p>Text</p>',
        excerpt_ru: 'Коротко', excerpt_en: 'In short',
        published_at: '2026-09-01T10:00:00.000Z', updated_at: '2026-09-02T10:00:00.000Z',
      },
      {
        slug: 'only-russian', title_ru: 'Сравнение < и > в шаблонах', title_en: '',
        text_ru: '<p>Текст</p>', text_en: '',
        excerpt_ru: 'Про экранирование', excerpt_en: '',
        published_at: '2026-08-01T10:00:00.000Z', updated_at: '2026-08-01T10:00:00.000Z',
      },
    ]],
  })
})

describe('rss', () => {
  test('a locale the site does not have is a 404, not a default feed', async () => {
    await expect(feed('de')).rejects.toMatchObject({ statusCode: 404 })
  })

  test('the english feed links to /en and uses the english title', async () => {
    const xml = await feed('en')
    expect(xml).toContain('<link>https://whostolemysleep.ru/en/blog/rust-backend</link>')
    expect(xml).toContain('<title>A backend in Rust</title>')
    expect(xml).toContain('<language>en-US</language>')
  })

  test('an empty english title falls back to russian, as everywhere else', async () => {
    const xml = await feed('en')
    expect(xml).toContain('Сравнение')
  })

  test('titles are escaped — a bare < would end the feed as xml', async () => {
    const xml = await feed('en')
    expect(xml).toContain('&lt; и &gt;')
    expect(xml).not.toContain('<title>Сравнение < и > в шаблонах</title>')
  })

  test('dates are rfc 822, which is what a reader parses', async () => {
    const xml = await feed('ru')
    expect(xml).toContain('<pubDate>Tue, 01 Sep 2026 10:00:00 GMT</pubDate>')
  })

  test('lastBuildDate follows the newest post, not the clock', async () => {
    const xml = await feed('ru')
    expect(xml).toContain('<lastBuildDate>Wed, 02 Sep 2026 10:00:00 GMT</lastBuildDate>')
  })

  test('the full post body travels in the feed, wrapped in cdata', async () => {
    const xml = await feed('ru')
    expect(xml).toContain('<content:encoded><![CDATA[<p>Текст</p>]]></content:encoded>')
  })

  test('only published blog posts are asked for', async () => {
    await feed('ru')
    const call = state.calls.find(c => c.table === 'post')
    expect(call?.steps.map(s => s.m)).toEqual(['select', 'from', 'where', 'orderBy', 'limit'])
  })
})
