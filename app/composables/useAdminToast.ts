export interface Toast {
  id:   number
  kind: 'ok' | 'err'
  text: string
}

let nextId = 0

const LIFETIME_MS = 3500

/**
 * Замена разрозненных saveMsg/errMsg/saved на страницах: каждая показывала
 * результат по-своему и в своём углу.
 */
export const useAdminToast = () => {
  const toasts = useState<Toast[]>('admin:toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(kind: Toast['kind'], text: string) {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, kind, text }]
    if (import.meta.client) setTimeout(() => dismiss(id), LIFETIME_MS)
  }

  return {
    toasts,
    dismiss,
    ok:  (text: string) => push('ok', text),
    err: (text: string) => push('err', text),
  }
}
