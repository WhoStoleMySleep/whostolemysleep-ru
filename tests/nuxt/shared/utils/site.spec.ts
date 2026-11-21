import { describe, test, expect } from 'vitest'

const NOW = new Date('2026-10-24T00:00:00Z').getTime()

describe('yearsSince', () => {
  test('counts only full years', async () => {
    const { yearsSince } = await import('~~/shared/utils/site')
    expect(yearsSince('2021-11-01', NOW)).toBe(4)
    expect(yearsSince('2021-10-01', NOW)).toBe(5)
  })

  test('полный год учитывается ровно на границе периода', async () => {
    const { yearsSince } = await import('~~/shared/utils/site')
    const start = '2020-01-01T00:00:00Z'
    const anniversary = new Date(start).getTime() + 365.25 * 24 * 60 * 60 * 1000
    expect(yearsSince(start, anniversary - 1)).toBe(0)
    expect(yearsSince(start, anniversary)).toBe(1)
  })

  test('в момент начала работы стаж равен нулю', async () => {
    const { yearsSince } = await import('~~/shared/utils/site')
    const start = '2020-01-01T00:00:00Z'
    expect(yearsSince(start, new Date(start).getTime())).toBe(0)
  })

  test('with no first job the default stands in, not zero', async () => {
    const { yearsSince, DEFAULT_YEARS } = await import('~~/shared/utils/site')
    expect(yearsSince(null, NOW)).toBe(DEFAULT_YEARS)
    expect(yearsSince(undefined, NOW)).toBe(DEFAULT_YEARS)
    expect(yearsSince('', NOW)).toBe(DEFAULT_YEARS)
  })
})

describe('OG_IMAGE', () => {
  test('is an absolute address on the site — crawlers do not resolve relative ones', async () => {
    const { OG_IMAGE, SITE_URL } = await import('~~/shared/utils/site')
    expect(OG_IMAGE.startsWith(`${SITE_URL}/`)).toBe(true)
  })
})
