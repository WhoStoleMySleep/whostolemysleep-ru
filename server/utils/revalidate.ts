import { SITE_URL } from '~~/shared/utils/site'

const BASE = process.env.NUXT_PUBLIC_SITE_URL ?? SITE_URL
const CONCURRENCY = 6
const REQUEST_TIMEOUT = 10_000

/** Статус каждой страницы нужен для повторной попытки только неудачных обновлений. */
export interface RevalidateResult {
  revalidated: string[]
  failed:      { path: string; reason: string }[]
}

async function refreshPage(path: string, token: string, missing: Set<string>) {
  try {
    await $fetch(new URL(path, BASE).toString(), {
      headers:      { 'x-prerender-revalidate': token },
      responseType: 'text',
      retry:        0,
      timeout:      REQUEST_TIMEOUT,
    })
    return { path, reason: '' }
  } catch (error) {
    const code = (error as { statusCode?: number }).statusCode
    // 404 ожидается только для страниц, отсутствие которых уже подтверждено в БД.
    const expected = code === 404 && missing.has(path)
    return { path, reason: expected ? '' : code ? `HTTP ${code}` : String(error) }
  }
}

/** На Vercel обновляет edge-копии; локально очищает кеш обработчиков Nitro. */
export async function revalidatePaths(paths: string[], missingPaths: string[] = []): Promise<RevalidateResult> {
  if (!paths.length) return { revalidated: [], failed: [] }

  if (!process.env.VERCEL) {
    const storage = useStorage('cache')
    const keys = await storage.getKeys('nitro:handlers')
    await Promise.all(keys.map(key => storage.removeItem(key)))
    return { revalidated: paths, failed: [] }
  }

  const token = process.env.ISR_BYPASS_TOKEN
  if (!token) throw createError({ statusCode: 500, message: 'ISR_BYPASS_TOKEN is not set — cache cannot be revalidated' })

  const missing = new Set(missingPaths)
  const results: { path: string; reason: string }[] = []
  for (let offset = 0; offset < paths.length; offset += CONCURRENCY) {
    results.push(...await Promise.all(paths.slice(offset, offset + CONCURRENCY).map(path => refreshPage(path, token, missing))))
  }
  return {
    revalidated: results.filter(result => !result.reason).map(result => result.path),
    failed: results.filter(result => result.reason),
  }
}
