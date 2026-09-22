import { describe, test, expect } from 'vitest'

describe('useAdminFormat.period', () => {
  test('month and year in English — the admin panel is not localised', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().period('2020-03-01', '2021-07-01')).toBe('Mar 2020 — Jul 2021')
  })

  test('with no end date it reads present, not emptiness', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().period('2020-03-01', null)).toBe('Mar 2020 — present')
  })
})

describe('useAdminFormat.date', () => {
  test('day, month and year as numbers', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().date('2024-02-09')).toBe('09/02/2024')
  })

  test('an empty date is shown as a dash', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().date(null)).toBe('—')
  })
})
