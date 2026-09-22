/**
 * Formatting for the admin panel. Separate from useFormatDate, which takes its
 * locale and labels from the site's i18n: admin routes live outside the locales
 * (defineI18nRoute(false)) and the whole panel is in English.
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
