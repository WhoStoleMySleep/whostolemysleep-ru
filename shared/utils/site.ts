/**
 * The canonical origin. Feeds, the sitemap, share cards and structured data all
 * need an absolute address that does not depend on the host a request came in on.
 */
export const SITE_URL = 'https://whostolemysleep.ru'

/** The share card for pages without a picture of their own. */
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`

/**
 * Contacts for when the settings row is empty or failed to load: the footer, the
 * contacts page and the structured data must never end up with a blank link.
 */
export const CONTACTS = {
  email:    'whostolemysleep@gmail.com',
  telegram: 'https://t.me/WhoStoleMySleepDev',
  github:   'https://github.com/WhoStoleMySleepDev',
} as const

/** Shown while no job has been entered yet, so the hero never says "0+ years". */
export const DEFAULT_YEARS = 5

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000

/** Full years since the first job; DEFAULT_YEARS when there is no such date. */
export function yearsSince(start: string | null | undefined, now = Date.now()): number {
  if (!start) return DEFAULT_YEARS
  return Math.floor((now - new Date(start).getTime()) / MS_PER_YEAR)
}
