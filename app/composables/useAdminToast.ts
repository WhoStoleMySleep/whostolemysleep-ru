export interface Toast {
  id:   number
  kind: 'ok' | 'err'
  text: string
}

let nextId = 0
/** Pending auto-dismissals: closing a toast by hand must not leave its timer behind. */
const timers = new Map<number, ReturnType<typeof setTimeout>>()

const LIFETIME_MS = 3500

/**
 * Replaces the scattered saveMsg/errMsg/saved flags: every page used to report
 * the result in its own way and in its own corner.
 */
export const useAdminToast = () => {
  const toasts = useState<Toast[]>('admin:toasts', () => [])

  function dismiss(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(kind: Toast['kind'], text: string) {
    const id = ++nextId
    toasts.value = [...toasts.value, { id, kind, text }]
    if (import.meta.client) timers.set(id, setTimeout(() => dismiss(id), LIFETIME_MS))
  }

  return {
    toasts,
    dismiss,
    ok:  (text: string) => push('ok', text),
    err: (text: string) => push('err', text),
  }
}
