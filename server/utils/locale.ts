import type { H3Event } from 'h3'
import type { Locale } from '~/types'

export function getLocale(event: H3Event): Locale {
  const { locale } = getQuery(event)
  return locale === 'en' ? 'en' : 'ru'
}

/** Возвращает локализованное значение, с fallback на ru если en пустой */
export function pick(ru: string, en: string, locale: Locale): string {
  return locale === 'en' && en ? en : ru
}
