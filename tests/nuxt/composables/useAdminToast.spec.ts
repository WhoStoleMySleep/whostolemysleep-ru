import { describe, test, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
})

describe('useAdminToast', () => {
  test('messages pile up in the order they appear and keep their kind', async () => {
    const { useAdminToast } = await import('~/composables/useAdminToast')
    const toast = useAdminToast()
    toast.toasts.value = []

    toast.ok('Saved')
    toast.err('Failed')

    expect(toast.toasts.value.map((t) => [t.kind, t.text])).toEqual([['ok', 'Saved'], ['err', 'Failed']])
  })

  test('every message has its own id — identical text does not collapse', async () => {
    const { useAdminToast } = await import('~/composables/useAdminToast')
    const toast = useAdminToast()
    toast.toasts.value = []

    toast.ok('Saved')
    toast.ok('Saved')

    const [first, second] = toast.toasts.value
    expect(first!.id).not.toBe(second!.id)
  })

  test('dismiss removes only its own message', async () => {
    const { useAdminToast } = await import('~/composables/useAdminToast')
    const toast = useAdminToast()
    toast.toasts.value = []

    toast.ok('First')
    toast.ok('Second')
    toast.dismiss(toast.toasts.value[0]!.id)

    expect(toast.toasts.value.map((t) => t.text)).toEqual(['Second'])
  })

  test('a message leaves by itself — nobody has to keep it on screen', async () => {
    vi.useFakeTimers()
    const { useAdminToast } = await import('~/composables/useAdminToast')
    const toast = useAdminToast()
    toast.toasts.value = []

    toast.ok('Saved')
    expect(toast.toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(3500)
    expect(toast.toasts.value).toHaveLength(0)
  })
})
