export interface Toast {
  id:   number
  kind: 'ok' | 'err'
  text: string
}

let nextId = 0

const LIFETIME_MS = 3500

/**
 * Replaces the scattered saveMsg/errMsg/saved flags: every page used to report
 * the result in its own way and in its own corner.
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
