import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { H3Event } from 'h3'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'
import { plan, stepArg } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const mocks = { header: vi.fn(), cached: vi.fn((handler: unknown, _options: unknown) => handler) }
const posts = [
  { slug: 'older', type: 'blog', title: 'Older', title_ru: 'Старая', excerpt: '', excerpt_ru: '<b>Описание</b>', url: null, published_at: '2026-01-01' },
  { slug: 'project', type: 'project', title: '', title_ru: 'Внешний проект', excerpt: '[Ссылка](https://x.test)', excerpt_ru: '', url: 'https://project.test', published_at: '2026-03-01' },
  { slug: 'newer', type: 'blog', title: 'Newer', title_ru: 'Новая', excerpt: 'New excerpt', excerpt_ru: '', url: null, published_at: '2026-02-01' },
  { slug: 'internal', type: 'project', title: 'Internal', title_ru: 'Внутренний', excerpt: '', excerpt_ru: '', url: null, published_at: null },
]

async function digest() {
  const { default: handler } = await import('~~/server/routes/llms.txt')
  return (handler as (event: H3Event) => Promise<string>)({} as H3Event)
}

beforeEach(() => {
  vi.resetModules()
  vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-10T00:00:00Z').getTime())
  plan(state, {
    'select:post': [posts],
    'select:settings': [[{ open_to_work: true, email: 'mail@test.ru', github_url: 'https://github.test', telegram_url: 'https://telegram.test' }]],
    'select:experience': [[{ date_from: '2022-02-01' }]],
    'select:skill': [[{ group: 'Languages', skill: 'TypeScript' }, { group: 'Frameworks', skill: 'Nuxt' }, { group: 'Languages', skill: 'Rust' }]],
  })
  mocks.header.mockClear()
  mocks.cached.mockClear()
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineCachedEventHandler', mocks.cached)
  vi.stubGlobal('setHeader', mocks.header)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Дайджест llms.txt', () => {
  test('сохраняет полный Markdown, порядок разделов и локализованные ссылки', async () => {
    expect(await digest()).toMatchInlineSnapshot(`
      "# whostolemysleep

      > Full-stack developer with 4+ years of experience. Production web apps in Vue/Nuxt and React, native desktop and mobile apps in Rust with Tauri. Previously built high-load interfaces for two of Russia's largest banks. Open to remote work worldwide.

      Personal site and portfolio. Every page exists in two languages: English under \`/en\` and Russian under \`/ru\`. The content is identical, only the language differs — the links below point to the English version.

      Currently open to new projects and long-term remote collaboration.

      ## Pages

      - [Home](https://whostolemysleep.ru/en): intro, main stack, latest posts and projects
      - [Projects](https://whostolemysleep.ru/en/projects): portfolio of work
      - [Blog](https://whostolemysleep.ru/en/blog): articles on frontend development
      - [Resume](https://whostolemysleep.ru/en/resume): work experience, education, technical skills
      - [Contacts](https://whostolemysleep.ru/en/contacts): contact form and direct links

      ## Focus

      - **Vue / Nuxt** — architecture, SSR/ISR/SSG, Nitro, i18n
      - **React / Next** — React 19, Next.js, Zustand, virtualized lists, motion
      - **Rust / Tauri** — cross-platform desktop and mobile, native plugins, system APIs
      - **TypeScript / Node** — REST and GraphQL APIs, published npm packages; Core Web Vitals as a budget, this site scores 100/100 on mobile

      ## Skills

      - **Languages**: TypeScript, Rust
      - **Frameworks**: Nuxt

      ## Projects

      - [Внешний проект](https://project.test): Ссылка
      - [Internal](https://whostolemysleep.ru/en/blog/internal)

      ## Blog posts

      - [Newer](https://whostolemysleep.ru/en/blog/newer): New excerpt
      - [Older](https://whostolemysleep.ru/en/blog/older): Описание

      ## Contact

      - Email: mail@test.ru
      - GitHub: https://github.test
      - Telegram: https://telegram.test
      - [Contact form](https://whostolemysleep.ru/en/contacts)

      ## Optional

      - [Russian version](https://whostolemysleep.ru/ru): the same site in Russian
      - [Privacy Policy](https://whostolemysleep.ru/en/privacy): personal data processing, RF law 152-FZ
      "
    `)
    expect(mocks.header).toHaveBeenCalledWith(expect.anything(), 'Content-Type', 'text/markdown; charset=utf-8')
    expect(mocks.cached.mock.calls[0]?.[1]).toMatchObject({ maxAge: 3600 })
    expect((mocks.cached.mock.calls[0]?.[1] as { getKey: () => string }).getKey()).toBe('llms-txt')
  })

  test('не выводит пустые разделы и использует годы по умолчанию без записей в БД', async () => {
    plan(state)
    const text = await digest()
    expect(text).toContain('with 5+ years of experience')
    expect(text).toContain('Currently not looking for new projects.')
    expect(text).not.toContain('## Skills')
    expect(text).not.toContain('## Projects')
    expect(text).not.toContain('## Blog posts')
    expect(text).toContain('## Contact\n\n- [Contact form](https://whostolemysleep.ru/en/contacts)\n\n## Optional')
    expect(text).not.toContain('- Email:')
  })

  test('запрашивает публикации, первую работу и упорядоченные навыки без дополнительных SQL-запросов', async () => {
    await digest()
    expect(state.calls).toHaveLength(4)
    expect(state.calls.map(call => `${call.op}:${call.table}`)).toEqual(['select:post', 'select:settings', 'select:experience', 'select:skill'])
    expect(stepArg(state.calls, 'select:experience', 'limit')).toBe(1)
    expect(state.calls.find(call => call.table === 'skill')?.steps.map(step => step.m)).toEqual(['select', 'from', 'innerJoin', 'orderBy'])
    const { PgDialect } = await import('drizzle-orm/pg-core')
    const where = stepArg<import('drizzle-orm').SQL>(state.calls, 'select:post', 'where')!
    expect(new PgDialect().sqlToQuery(where).params).toEqual([true])
  })
})
