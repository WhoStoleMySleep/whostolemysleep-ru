/**
 * Единственная дверь в /api/admin из интерфейса.
 *
 * Держит три вещи, которые раньше каждая страница решала сама (и по-разному):
 * передачу куки при SSR, разбор текста ошибки и реакцию на протухшую сессию.
 */

/** Текст ошибки из ответа H3. До этого по страницам был размазан `e?.data?.message ?? 'Error'`. */
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
  // На сервере обычный $fetch не передаёт куки браузера — запрос уходит
  // анонимным и получает 401. useRequestFetch проксирует заголовки запроса.
  const request = useRequestFetch()

  async function call<T>(url: string, opts?: Parameters<typeof $fetch<T>>[1]): Promise<T> {
    try {
      return await request<T>(url, opts as never) as T
    } catch (e) {
      // Сессия истекла или куку удалили: держать пользователя на странице,
      // где ничего не сохраняется, бессмысленно.
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
