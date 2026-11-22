import { describe, expect, test } from 'vitest'

const NOW = Date.parse('2026-11-22T12:00:00Z')
const period = (date_from: string, date_to: string | null) => ({ date_from, date_to })

describe('Автоматический стаж', () => {
  test.each([
    { name: 'пустой список', periods: [], months: 0 },
    { name: 'закрытая работа', periods: [period('2020-01-01', '2021-12-31')], months: 24 },
    { name: 'пауза не считается', periods: [period('2020-01-01', '2020-12-31'), period('2022-01-01', '2022-12-31')], months: 24 },
    { name: 'частичное пересечение', periods: [period('2020-01-01', '2021-12-31'), period('2021-01-01', '2022-12-31')], months: 36 },
    { name: 'вложенное место', periods: [period('2020-01-01', '2022-12-31'), period('2021-01-01', '2021-12-31')], months: 36 },
    { name: 'соседние периоды', periods: [period('2020-01-01', '2020-06-30'), period('2020-07-01', '2020-12-31')], months: 12 },
    { name: 'текущая работа', periods: [period('2025-11-23', null)], months: 12 },
    { name: 'параллельные текущие', periods: [period('2025-11-23', null), period('2026-01-01', null)], months: 12 },
    { name: 'будущее не считается', periods: [period('2027-01-01', null)], months: 0 },
    { name: 'будущее окончание ограничено сегодня', periods: [period('2025-11-23', '2027-01-01')], months: 12 },
    { name: 'високосный февраль', periods: [period('2024-02-01', '2024-02-29')], months: 1 },
    { name: 'обычный февраль', periods: [period('2023-02-01', '2023-02-28')], months: 1 },
    { name: 'конец месяца', periods: [period('2024-01-31', '2024-02-29')], months: 1 },
    { name: 'неполный месяц', periods: [period('2026-11-01', null)], months: 0 },
    { name: 'невалидные и обратные даты', periods: [period('2020-02-30', null), period('bad', null), period('2021-01-01', '2020-01-01'), period('2020-01-01', '')], months: 0 },
  ])('$name', async ({ periods, months }) => {
    const { experienceMonths, experienceYears } = await import('~~/shared/utils/experience')
    expect(experienceMonths(periods, NOW)).toBe(months)
    expect(experienceYears(periods, NOW)).toBe(Math.floor(months / 12))
  })

  test('считает увольнение включительно и не зависит от времени суток', async () => {
    const { experienceMonths } = await import('~~/shared/utils/experience')
    const input = [period('2026-10-23', null)]
    expect(experienceMonths(input, Date.parse('2026-11-21T23:59:59Z'))).toBe(0)
    expect(experienceMonths(input, Date.parse('2026-11-22T00:00:00Z'))).toBe(1)
    expect(experienceMonths([period('2026-10-23', '2026-11-21')], NOW)).toBe(0)
  })

  test('не меняет порядок и даты исходных записей', async () => {
    const { experienceMonths } = await import('~~/shared/utils/experience')
    const input = Object.freeze([Object.freeze(period('2022-01-01', null)), Object.freeze(period('2020-01-01', '2023-01-01'))])
    const before = JSON.stringify(input)
    experienceMonths(input, NOW)
    expect(JSON.stringify(input)).toBe(before)
    expect(experienceMonths(input, NaN)).toBe(0)
  })
})

describe('Формат стажа', () => {
  test.each([
    [0, 'ru', 'менее месяца'], [1, 'ru', '1 месяц'], [2, 'ru', '2 месяца'],
    [5, 'ru', '5 месяцев'], [11, 'ru', '11 месяцев'], [12, 'ru', '1 год'],
    [26, 'ru', '2 года 2 месяца'], [65, 'ru', '5 лет 5 месяцев'],
    [0, 'en', 'less than a month'], [1, 'en', '1 month'], [12, 'en', '1 year'],
    [26, 'en', '2 years 2 months'], [13, 'en', '1 year 1 month'],
  ] as const)('%s месяцев в локали %s', async (months, locale, expected) => {
    const { formatExperience } = await import('~~/shared/utils/experience')
    expect(formatExperience(months, locale)).toBe(expected)
  })
})
