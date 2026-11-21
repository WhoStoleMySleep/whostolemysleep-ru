import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { H3Event } from 'h3'

const event = {} as H3Event
const mocks = { cookie: vi.fn(), header: vi.fn(), setCookie: vi.fn(), redirect: vi.fn() }

async function root() {
  const { default: handler } = await import('~~/server/routes/index.get')
  return handler(event)
}

beforeEach(() => {
  mocks.cookie.mockReset()
  mocks.header.mockReset()
  mocks.setCookie.mockReset()
  mocks.redirect.mockReset().mockReturnValue('redirected')
  vi.stubGlobal('defineRouteMeta', () => {})
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getCookie', mocks.cookie)
  vi.stubGlobal('getHeader', mocks.header)
  vi.stubGlobal('setCookie', mocks.setCookie)
  vi.stubGlobal('sendRedirect', mocks.redirect)
})
afterEach(() => vi.unstubAllGlobals())

describe('Выбор языка при открытии сайта', () => {
  test.each(['ru', 'en'])('сохранённый язык %s имеет приоритет над заголовком', async locale => {
    mocks.cookie.mockReturnValue(locale)
    mocks.header.mockReturnValue('uk')
    expect(await root()).toBe('redirected')
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(event, `/${locale}`, 302)
    expect(mocks.setCookie).not.toHaveBeenCalled()
    expect(mocks.header).not.toHaveBeenCalled()
  })

  test.each([
    ['ru-RU, en;q=0.9', 'ru'], ['uk-UA', 'ru'], ['be-BY', 'ru'], ['kk-KZ', 'ru'],
    ['EN-us, RU;q=0', 'ru'], ['de-DE, en;q=0.5', 'en'], ['', 'en'], [undefined, 'en'],
  ])('определяет %s как %s и сохраняет выбор на год', async (header, locale) => {
    mocks.cookie.mockReturnValue('invalid')
    mocks.header.mockReturnValue(header)
    await root()
    expect(mocks.setCookie).toHaveBeenCalledExactlyOnceWith(event, 'locale', locale, {
      maxAge: 365 * 24 * 3600, path: '/', sameSite: 'lax',
    })
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(event, `/${locale}`, 302)
  })
})
