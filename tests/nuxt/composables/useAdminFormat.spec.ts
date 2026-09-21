import { describe, test, expect } from 'vitest'

describe('useAdminFormat.period', () => {
  test('месяц и год по-английски — админка не локализуется', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().period('2020-03-01', '2021-07-01')).toBe('Mar 2020 — Jul 2021')
  })

  test('без даты окончания — present, а не пустота', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().period('2020-03-01', null)).toBe('Mar 2020 — present')
  })
})

describe('useAdminFormat.date', () => {
  test('день, месяц и год числами', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().date('2024-02-09')).toBe('09/02/2024')
  })

  test('пустая дата показывается прочерком', async () => {
    const { useAdminFormat } = await import('~/composables/useAdminFormat')
    expect(useAdminFormat().date(null)).toBe('—')
  })
})
