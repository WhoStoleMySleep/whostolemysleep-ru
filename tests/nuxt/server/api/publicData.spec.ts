import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'
import { plan } from '~~/tests/helpers/fakeDb'
import type { FakeDbState } from '~~/tests/helpers/fakeDb'

const state = vi.hoisted((): FakeDbState => ({ results: {}, calls: [], cursor: {} }))
vi.mock('~~/server/db', async () => {
  const { makeFakeDb } = await import('~~/tests/helpers/fakeDb')
  return { db: makeFakeDb(state) }
})

const routes = [
  () => import('~~/server/api/about.get'),
  () => import('~~/server/api/settings.get'),
  () => import('~~/server/api/skills.get'),
  () => import('~~/server/api/resume/education.get'),
  () => import('~~/server/api/resume/experience.get'),
  () => import('~~/server/api/posts/latest.get'),
  () => import('~~/server/api/posts/[type].get'),
  () => import('~~/server/api/blog/[slug].get'),
]

beforeEach(() => {
  plan(state, { 'select:settings': [[{ email: 'first@example.com' }], [{ email: 'second@example.com' }]] }, {
    aboutMe: [{ id: 1, text_ru: 'Первый' }],
    skillGroup: [{ id: 1, skills: [] }],
    education: [{ id: 1 }],
    experience: [{ id: 1, bullets: [] }],
    post: [{ id: 1, slug: 'post', type: 'blog', title_ru: 'Первый', text_ru: '', excerpt_ru: '', url: null, images: [], postTags: [] }],
  })
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('defineCachedEventHandler', () => { throw new Error('Несогласованный кеш API') })
  vi.stubGlobal('getRouterParam', (_event: unknown, param: string) => param === 'type' ? 'blog' : 'post')
  vi.stubGlobal('getQuery', () => ({ locale: 'ru' }))
})
afterEach(() => vi.unstubAllGlobals())

describe('Свежие данные для пересборки ISR', () => {
  test.each(routes.map((load, index) => ({ load, index })))('публичный обработчик $index читает БД при каждом вызове', async ({ load }) => {
    const { default: handler } = await load()
    const request = handler as (event: H3Event) => Promise<unknown>
    const first = await request({} as H3Event)
    for (const [key, rows] of Object.entries(state.rows!)) {
      state.rows![key] = rows.map(row => ({ ...row as object, id: 2 }))
    }
    expect(await request({} as H3Event)).not.toEqual(first)
  })

  test('изменённый текст доступен без ожидания прежнего TTL', async () => {
    const { default: handler } = await import('~~/server/api/about.get')
    const request = handler as (event: H3Event) => Promise<unknown>
    expect(await request({} as H3Event)).toEqual({ id: 1, text: 'Первый' })
    state.rows!.aboutMe = [{ id: 1, text_ru: 'Новый' }]
    expect(await request({} as H3Event)).toEqual({ id: 1, text: 'Новый' })
  })

  test('данные гидрации встроены в HTML, а ISR публичных страниц сохранён', async () => {
    vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
    const { default: config } = await import('~~/nuxt.config')
    expect(config.experimental?.payloadExtraction).toBe(false)
    const pages = [
      '/ru', '/en',
      '/ru/blog', '/en/blog', '/ru/blog/**', '/en/blog/**',
      '/ru/projects', '/en/projects',
      '/ru/resume', '/en/resume', '/ru/cv', '/en/cv',
      '/ru/contacts', '/en/contacts', '/ru/privacy', '/en/privacy',
    ] as const
    for (const route of pages) {
      expect(config.routeRules?.[route]?.isr).toBeTruthy()
    }
  })

  test('CSP разрешает отправку ошибок только в конкретный Sentry ingest', async () => {
    vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
    const { default: config } = await import('~~/nuxt.config')
    const policy = config.routeRules?.['/**']?.headers?.['Content-Security-Policy'] ?? ''
    const directives = policy.split('; ').map(directive => directive.split(' '))
    const connect = directives.find(([name]) => name === 'connect-src')

    expect(connect).toEqual([
      'connect-src', "'self'", 'https://va.vercel-scripts.com',
      'https://vitals.vercel-insights.com', 'https://o4512129513226240.ingest.us.sentry.io',
    ])
    expect(directives).toContainEqual(['default-src', "'self'"])
    expect(directives).toContainEqual(['object-src', "'none'"])
    expect(directives).toContainEqual(['frame-ancestors', "'none'"])
    expect(directives.find(([name]) => name === 'script-src')).toEqual([
      'script-src', "'self'", "'unsafe-inline'", 'https://va.vercel-scripts.com',
    ])
  })

  test('HTTP-кеш API выключен, кеш готовых страниц сохранён', async () => {
    vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
    const { default: config } = await import('~~/nuxt.config')
    expect(config.routeRules?.['/api/**']?.headers?.['Cache-Control']).toBe('no-store')
    expect(config.routeRules?.['/ru']?.isr).toBeTruthy()
    expect(config.routeRules?.['/ru/blog/**']?.isr).toBeTruthy()
  })
})
