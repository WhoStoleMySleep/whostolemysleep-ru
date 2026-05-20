export interface SiteSettings {
  open_to_work:     boolean
  show_search:      boolean
  github_url:       string
  telegram_url:     string
  email:            string
  years_experience: number
}

export function useSettings() {
  return useAsyncData<SiteSettings>('site-settings', () => $fetch('/api/settings'))
}
