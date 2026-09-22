import { describe, test, expect, vi, afterEach } from 'vitest'
import type { H3Event } from 'h3'

const event = {} as H3Event

function query(params: Record<string, unknown>) {
  vi.stubGlobal('getQuery', () => params)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getLocale', () => {
  test('locale=en switches to English', async () => {
    query({ locale: 'en' })
    const { getLocale } = await import('~~/server/utils/locale')
    expect(getLocale(event)).toBe('en')
  })

  test('everything else reads as Russian — the language is not taken from an unclear parameter', async () => {
    const { getLocale } = await import('~~/server/utils/locale')

    for (const params of [{}, { locale: 'ru' }, { locale: 'de' }, { locale: ['en'] }]) {
      query(params)
      expect(getLocale(event)).toBe('ru')
    }
  })
})

describe('pick', () => {
  test('for en it returns the English variant', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', 'english', 'en')).toBe('english')
  })

  test('for ru it returns Russian even when the English field is filled in', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', 'english', 'ru')).toBe('русский')
  })

  test('an empty translation is not shown as emptiness — it falls back to Russian', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', '', 'en')).toBe('русский')
  })
})
