export interface SiteSettings {
  open_to_work:     boolean
  show_search:      boolean
  github_url:       string
  telegram_url:     string
  email:            string
  years_experience: number
}

/**
 * Тип ответа указан прямо у $fetch: без него TypeScript пытается вывести его
 * из таблицы маршрутов Nitro и упирается в предел вложенности (TS2321).
 */
export function useSettings() {
  return useAsyncData<SiteSettings>('site-settings', () => $fetch<SiteSettings>('/api/settings'))
}
