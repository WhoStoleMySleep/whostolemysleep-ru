export interface SiteSettings {
  open_to_work:     boolean
  show_search:      boolean
  github_url:       string
  telegram_url:     string
  email:            string
  years_experience: number
}

/**
 * The response type is given to $fetch explicitly: without it TypeScript tries to
 * infer it from Nitro's route table and hits the nesting limit (TS2321).
 */
export function useSettings() {
  return useAsyncData<SiteSettings>('site-settings', () => $fetch<SiteSettings>('/api/settings'))
}
