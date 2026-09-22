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
  test('locale=en включает английский', async () => {
    query({ locale: 'en' })
    const { getLocale } = await import('~~/server/utils/locale')
    expect(getLocale(event)).toBe('en')
  })

  test('всё остальное читается как русский — язык не берут из непонятного параметра', async () => {
    const { getLocale } = await import('~~/server/utils/locale')

    for (const params of [{}, { locale: 'ru' }, { locale: 'de' }, { locale: ['en'] }]) {
      query(params)
      expect(getLocale(event)).toBe('ru')
    }
  })
})

describe('pick', () => {
  test('для en отдаёт английский вариант', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', 'english', 'en')).toBe('english')
  })

  test('для ru отдаёт русский, даже когда английский заполнен', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', 'english', 'ru')).toBe('русский')
  })

  test('пустой перевод не показывается пустотой — откат на русский', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', '', 'en')).toBe('русский')
  })
})
