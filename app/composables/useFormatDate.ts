export function useFormatDate() {
  const { locale, t } = useLocale()
  const dateLocale = computed(() => locale.value === 'en' ? 'en-US' : 'ru-RU')

  function format(dateStr: string | Date): string {
    return new Date(dateStr).toLocaleDateString(dateLocale.value, {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
    })
  }

  function formatLong(dateStr: string | Date): string {
    return new Date(dateStr).toLocaleDateString(dateLocale.value, {
      day:   'numeric',
      month: 'long',
      year:  'numeric',
    })
  }

  function formatPeriod(from: string, to: string | null): string {
    const fromStr = new Date(from).toLocaleDateString(dateLocale.value, { month: 'short', year: 'numeric' })
    if (!to) return `${fromStr} — ${t('resume.present')}`
    const toStr = new Date(to).toLocaleDateString(dateLocale.value, { month: 'short', year: 'numeric' })
    return `${fromStr} — ${toStr}`
  }

  return { format, formatLong, formatPeriod }
}
