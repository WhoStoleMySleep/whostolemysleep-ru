/**
 * The only door from the UI into /api/admin.
 *
 * It holds three things every page used to solve on its own, differently each
 * time: passing the cookie during SSR, reading the error text out of a response,
 * and reacting to an expired session.
 */

const UNAUTHORIZED_STATUS = 401

/** The error text out of an H3 response. `e?.data?.message ?? 'Error'` used to be smeared across every page. */
export function adminError(error: unknown): string {
  const responseError = error as { data?: { message?: string }, statusMessage?: string, message?: string }
  return responseError?.data?.message || responseError?.statusMessage || responseError?.message || 'Unknown error'
}

function isUnauthorized(error: unknown): boolean {
  const responseError = error as { statusCode?: number, status?: number, response?: { status?: number } }
  return responseError?.statusCode === UNAUTHORIZED_STATUS
    || responseError?.response?.status === UNAUTHORIZED_STATUS
}

/** Requests of the admin panel: they keep the session cookie during SSR and send an expired session back to the login page. */
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
