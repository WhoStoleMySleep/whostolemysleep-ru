/**
 * Форматирование для админки. Отдельно от useFormatDate: тот берёт
 * локаль и подписи из i18n сайта, а в админке маршруты вне локалей
 * (defineI18nRoute(false)) и весь интерфейс английский.
 */
export function useAdminFormat() {
  function period(from: string, to: string | null): string {
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `${fmt(from)} — ${to ? fmt(to) : 'present'}`
  }

  function date(d: string | null): string {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
  }

  return { period, date }
}
