/**
 * The only door from the UI into /api/admin.
 *
 * It holds three things every page used to solve on its own, differently each
 * time: passing the cookie during SSR, reading the error text out of a response,
 * and reacting to an expired session.
 */

/** The error text out of an H3 response. `e?.data?.message ?? 'Error'` used to be smeared across every page. */
export function adminError(e: unknown): string {
  const err = e as { data?: { message?: string }, statusMessage?: string, message?: string }
  return err?.data?.message || err?.statusMessage || err?.message || 'Unknown error'
}

function isUnauthorized(e: unknown): boolean {
  return (e as { statusCode?: number, status?: number })?.statusCode === 401
    || (e as { response?: { status?: number } })?.response?.status === 401
}

export const useAdminApi = () => {
  const authed = useState('admin:authed', () => false)
  // On the server a plain $fetch does not forward the browser's cookies — the
  // request goes out anonymous and gets a 401. useRequestFetch proxies the headers.
  const request = useRequestFetch()

  async function call<T>(url: string, opts?: Parameters<typeof $fetch<T>>[1]): Promise<T> {
    try {
      return await request<T>(url, opts as never) as T
    } catch (e) {
      // The session expired or the cookie was removed: keeping the user on a page
      // where nothing can be saved is pointless.
      if (isUnauthorized(e)) {
        authed.value = false
        await navigateTo('/admin/login')
      }
      throw e
    }
  }

  return {
    call,
    get:    <T>(url: string)               => call<T>(url),
    post:   <T>(url: string, body: unknown) => call<T>(url, { method: 'POST',   body } as never),
    patch:  <T>(url: string, body: unknown) => call<T>(url, { method: 'PATCH',  body } as never),
    remove: <T>(url: string)               => call<T>(url, { method: 'DELETE' } as never),
  }
}
