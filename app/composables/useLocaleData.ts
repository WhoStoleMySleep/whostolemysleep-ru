/**
 * A public endpoint in the language being read, cached per locale.
 *
 * The key is derived from the endpoint, so pages asking for the same data share one
 * entry in the payload: /resume and /cv used to fetch the same four endpoints under
 * different keys. The handler lives here once as well — Nuxt compares handlers of
 * calls that share a key and warns when they differ.
 */
export function useLocaleData<T>(url: string, opts: { lazy?: boolean } = {}) {
  const { locale } = useLocale()
  // $fetch with a url that is only known as a string makes TypeScript expand Nitro's
  // whole route table and give up (TS2321); the response type is T by contract.
  const get = $fetch as unknown as (path: string, init: { query: { locale: string } }) => Promise<T>

  return useAsyncData(
    () => `${url}-${locale.value}`,
    () => get(url, { query: { locale: locale.value } }),
    { lazy: opts.lazy },
  )
}
