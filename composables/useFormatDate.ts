export function useFormatDate() {
  function format(dateStr: string | Date): string {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  function formatLong(dateStr: string | Date): string {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatPeriod(from: string, to: string | null): string {
    const fromStr = new Date(from).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
    if (!to) return `${fromStr} — н.в.`
    const toStr = new Date(to).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' })
    return `${fromStr} — ${toStr}`
  }

  return { format, formatLong, formatPeriod }
}
