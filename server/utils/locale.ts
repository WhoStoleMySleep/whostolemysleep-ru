import type { H3Event } from 'h3'
import type { Locale } from '~/types'

/** Anything but an explicit `en` falls back to Russian, the site's primary language. */
export function getLocale(event: H3Event): Locale {
  const { locale } = getQuery(event)
  return locale === 'en' ? 'en' : 'ru'
}

/** Returns the localized value, falling back to ru when en is empty. */
export function pick(ru: string, en: string, locale: Locale): string {
  return locale === 'en' && en ? en : ru
}
