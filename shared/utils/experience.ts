/** Даты мест работы — единый источник стажа для страниц и серверных ответов. */
export interface ExperiencePeriod { date_from: string; date_to: string | null }

const MONTHS_PER_YEAR = 12
const MS_PER_DAY = 24 * 60 * 60 * 1000

type Interval = { start: number; end: number }

function parseDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const time = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return null
  return time
}

function intervalFor(period: ExperiencePeriod, today: number): Interval[] {
  const start = parseDay(period.date_from)
  const lastDay = period.date_to === null ? today : parseDay(period.date_to)
  if (start === null || lastDay === null || start > lastDay || start > today) return []
  // Дата увольнения включается в стаж; будущие дни не учитываются.
  return [{ start, end: Math.min(lastDay + MS_PER_DAY, today + MS_PER_DAY) }]
}

function fullMonths({ start, end }: Interval): number {
  const from = new Date(start)
  const to = new Date(end)
  const months = (to.getUTCFullYear() - from.getUTCFullYear()) * MONTHS_PER_YEAR
    + to.getUTCMonth() - from.getUTCMonth()
  return Math.max(0, months - Number(to.getUTCDate() < from.getUTCDate()))
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  const merged: Interval[] = []
  for (const interval of intervals) {
    const previous = merged.at(-1)
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end)
    else merged.push({ ...interval })
  }
  return merged
}

/** Полные календарные месяцы работы без перерывов и двойного учёта параллельных мест. */
export function experienceMonths(periods: readonly ExperiencePeriod[], now = Date.now()): number {
  if (!Number.isFinite(now)) return 0
  const today = Math.floor(now / MS_PER_DAY) * MS_PER_DAY
  const intervals = periods.flatMap(period => intervalFor(period, today)).sort((a, b) => a.start - b.start)
  return mergeIntervals(intervals).reduce((sum, interval) => sum + fullMonths(interval), 0)
}

/** Полные годы для компактного представления стажа на главной и в дайджесте. */
export function experienceYears(periods: readonly ExperiencePeriod[], now = Date.now()): number {
  return Math.floor(experienceMonths(periods, now) / MONTHS_PER_YEAR)
}

/** Локализованный стаж без округления месяцев до лет. */
export function formatExperience(months: number, locale: 'ru' | 'en'): string {
  const years = Math.floor(months / MONTHS_PER_YEAR)
  const remaining = months % MONTHS_PER_YEAR
  const units = locale === 'ru'
    ? { year: ['год', 'года', 'лет'], month: ['месяц', 'месяца', 'месяцев'] }
    : { year: ['year', 'years', 'years'], month: ['month', 'months', 'months'] }
  const plural = new Intl.PluralRules(locale)
  const label = (value: number, forms: string[]) => {
    const index = { one: 0, few: 1, many: 2, other: 2, zero: 2, two: 2 }[plural.select(value)]
    return `${value} ${forms[index]}`
  }
  if (months === 0) return locale === 'ru' ? 'менее месяца' : 'less than a month'
  return [years && label(years, units.year), remaining && label(remaining, units.month)].filter(Boolean).join(' ')
}
