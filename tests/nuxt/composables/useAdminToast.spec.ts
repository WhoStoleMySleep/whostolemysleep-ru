import { describe, test, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
})

describe('useAdminToast', () => {
  test('сообщения копятся в порядке появления и различают вид', async () => {
    const { useAdminToast } = await import('~/composables/useAdminToast')
    const toast = useAdminToast()
    toast.toasts.value = []

    toast.ok('Saved')
    toast.err('Failed')

    expect(toast.toasts.value.map((t) => [t.kind, t.text])).toEqual([['ok', 'Saved'], ['err', 'Failed']])
  })

  test('у каждого сообщения свой id — одинаковый текст не схлопывается', async () => {
    const { useAdminToast } = await import('~/composables/useAdminToast')
    const toast = useAdminToast()
    toast.toasts.value = []

    toast.ok('Saved')
    toast.ok('Saved')

    const [first, second] = toast.toasts.value
    expect(first!.id).not.toBe(second!.id)
  })

  test('dismiss убирает только своё сообщение', async () => {
    const { useAdminToast } = await import('~/composables/useAdminToast')
    const toast = useAdminToast()
    toast.toasts.value = []

    toast.ok('Первое')
    toast.ok('Второе')
    toast.dismiss(toast.toasts.value[0]!.id)

    expect(toast.toasts.value.map((t) => t.text)).toEqual(['Второе'])
  })

  test('сообщение уходит само — держать его на экране никто не обязан', async () => {
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
