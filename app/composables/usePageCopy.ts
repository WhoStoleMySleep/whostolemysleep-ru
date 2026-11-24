import { PAGE_FIELDS } from '~~/shared/content/registry'
import type { PageCopy } from '~~/shared/content/registry'
import type { Locale } from '~/types'

const PAGE_COPY_TIMEOUT_MS = 1500
const pageFields = new Map<string, number>(PAGE_FIELDS.map(field => [field.key, field.maxLength]))

function emptyPageCopy(): PageCopy {
  return { ru: {}, en: {} }
}

function hasSafePlaceholders(key: string, value: string): boolean {
  if (/[<>]|&(?:#\w+|lt|gt);/i.test(value)) return false
  const withoutAllowed = key === 'hero.lede' ? value.replace('{years}', '') : value
  return !/[{}]/.test(withoutAllowed) && (key !== 'hero.lede' || value.includes('{years}'))
}

function localeOverrides(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, text]) => {
    const maxLength = pageFields.get(key)
    return maxLength !== undefined && typeof text === 'string'
      && text.length <= maxLength && hasSafePlaceholders(key, text)
  }))
}

async function fetchPageCopy(): Promise<PageCopy> {
  try {
    const copy = await $fetch<Partial<PageCopy> | null>('/api/page-content', { timeout: PAGE_COPY_TIMEOUT_MS })
    return { ru: localeOverrides(copy?.ru), en: localeOverrides(copy?.en) }
  } catch {
    // Public pages must also render before the content migration or during an API outage.
    return emptyPageCopy()
  }
}

/** Overrides belong to the Nuxt request, never to the process-wide i18n catalog. */
export function usePageCopy() {
  const overrides = useState<PageCopy>('page-copy:overrides', emptyPageCopy)

  async function load() {
    const { data } = await useAsyncData('page-copy', fetchPageCopy, { default: emptyPageCopy })
    overrides.value = data.value ?? emptyPageCopy()
  }

  function text(key: string, locale: Locale, params: Record<string, string | number> = {}): string | null {
    if (!pageFields.has(key)) return null
    const value = overrides.value[locale]?.[key]
    if (typeof value !== 'string' || !hasSafePlaceholders(key, value)) return null
    return value.replaceAll('{years}', () => String(params.years ?? '{years}'))
  }

  return { overrides, load, text }
}
