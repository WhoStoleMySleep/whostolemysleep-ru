import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})
const row = {
  slug: 'article', title_ru: 'Заголовок <&>', title_en: '', text_ru: '<p>Текст ]]> после</p>', text_en: '',
  excerpt_ru: 'a'.repeat(301), excerpt_en: '', published_at: '2026-09-01T10:00:00.000Z', updated_at: null,
}

beforeEach(() => {
  plan(state, { 'select:post': [[row]] })
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-10T00:00:00Z').getTime())
})
afterEach(() => vi.restoreAllMocks())

describe('Сборка RSS', () => {
  test('экранирует XML, закрытие CDATA и ограничивает описание 300 символами', async () => {
    const { buildFeed } = await import('~~/server/utils/feed')
    const xml = await buildFeed('en')
    expect(xml).toContain('<title>Заголовок &lt;&amp;&gt;</title>')
    expect(xml).toContain(`<description>${'a'.repeat(300)}…</description>`)
    expect(xml).toContain('<content:encoded><![CDATA[<p>Текст ]]&gt; после</p>]]></content:encoded>')
    expect(xml).toContain('<lastBuildDate>Tue, 01 Sep 2026 10:00:00 GMT</lastBuildDate>')
    expect(stepArg(state.calls, 'select:post', 'limit')).toBe(20)
  })

  test('пустая лента остаётся полным XML с датой запроса', async () => {
    plan(state)
    const { buildFeed } = await import('~~/server/utils/feed')
    const xml = await buildFeed('ru')
    expect(xml).not.toContain('<item>')
    expect(xml).toContain('<lastBuildDate>Thu, 10 Sep 2026 00:00:00 GMT</lastBuildDate>')
    expect(xml).toContain('<atom:link href="https://whostolemysleep.ru/ru/rss.xml" rel="self" type="application/rss+xml" />')
    expect(xml.endsWith('  </channel>\n</rss>')).toBe(true)
  })

  test('отсутствующая дата публикации берётся из текущего времени', async () => {
    plan(state, { 'select:post': [[{ ...row, published_at: null }]] })
    const { buildFeed } = await import('~~/server/utils/feed')
    expect(await buildFeed('ru')).toContain('<pubDate>Thu, 10 Sep 2026 00:00:00 GMT</pubDate>')
  })

  test.each([undefined, null, '', 'de', 'EN', 1])('не считает %s поддерживаемым языком ленты', async value => {
    const { isFeedLocale } = await import('~~/server/utils/feed')
    expect(isFeedLocale(value)).toBe(false)
  })
})
