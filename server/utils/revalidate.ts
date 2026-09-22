/**
 * Flushing the cache of rendered pages.
 *
 * On Vercel an isr page lives at the edge, not in Nitro storage: the function is
 * started from scratch on every call, so clearing its local cache achieves
 * nothing — which is exactly why the Flush button used to report success while
 * the page on the site stayed the same.
 *
 * There is one way to refresh them from inside the app: request the page with an
 * x-prerender-revalidate header carrying the token from the .prerender-config.json
 * generated at build time. nuxt.config.ts puts ISR_BYPASS_TOKEN there, so the
 * variable is needed both at build time and at runtime — and the two values have
 * to match.
 *
 * Outside Vercel (locally, self-hosted) the older path through Nitro storage
 * still works: there the cache really does sit next to the server.
 */

const BASE = process.env.NUXT_PUBLIC_SITE_URL ?? 'https://whostolemysleep.ru'

export interface RevalidateResult {
  revalidated: string[]
  failed:      { path: string; reason: string }[]
}

export async function revalidatePaths(paths: string[]): Promise<RevalidateResult> {
  if (!paths.length) return { revalidated: [], failed: [] }

  if (!process.env.VERCEL) {
    const storage = useStorage('cache')
    const keys    = await storage.getKeys('nitro:handlers')
    await Promise.all(keys.map((k) => storage.removeItem(k)))
    return { revalidated: paths, failed: [] }
  }

  const token = process.env.ISR_BYPASS_TOKEN
  if (!token) {
    throw createError({
      statusCode: 500,
      message: 'ISR_BYPASS_TOKEN is not set — cache cannot be revalidated',
    })
  }

  const results = await Promise.all(paths.map(async (path) => {
    try {
      await $fetch(new URL(path, BASE).toString(), {
        headers:      { 'x-prerender-revalidate': token },
        responseType: 'text',
        retry:        0,
      })
      return { path, reason: '' }
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      return { path, reason: code ? `HTTP ${code}` : String(e) }
    }
  }))

  return {
    revalidated: results.filter((r) => !r.reason).map((r) => r.path),
    failed:      results.filter((r) => r.reason),
  }
}
