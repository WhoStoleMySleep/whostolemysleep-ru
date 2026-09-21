/**
 * Сброс кеша готовых страниц.
 *
 * На Vercel страницы с isr лежат на эдже, а не в хранилище Nitro: функция
 * на каждый вызов поднимается заново, и чистить её локальный кеш бесполезно
 * — именно поэтому кнопка Flush раньше отчитывалась об успехе, а страница
 * на сайте не менялась.
 *
 * Обновить их из приложения можно единственным способом: запросить страницу
 * с заголовком x-prerender-revalidate, где лежит токен из сгенерированного
 * на сборке .prerender-config.json. Токен туда кладёт nuxt.config.ts из
 * ISR_BYPASS_TOKEN, поэтому переменная нужна и на сборке, и в рантайме —
 * значения должны совпадать.
 *
 * Вне Vercel (локально, self-hosted) работает прежний путь через хранилище
 * Nitro: там кеш действительно лежит рядом с сервером.
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
