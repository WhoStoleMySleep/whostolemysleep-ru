import { describe, test, expect } from 'vitest'

describe('useAdminConfirm', () => {
  test('confirming returns true, declining returns false', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const yes = confirm.ask({ title: 'Delete?' })
    confirm.confirm()
    expect(await yes).toBe(true)

    const no = confirm.ask({ title: 'Delete?' })
    confirm.cancel()
    expect(await no).toBe(false)
  })

  test('the request is visible from outside and closes once answered', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const promise = confirm.ask({ title: 'Delete post?' })
    expect(confirm.request.value).toMatchObject({ title: 'Delete post?', action: 'Delete', danger: true })

    confirm.cancel()
    await promise
    expect(confirm.request.value).toBeNull()
  })

  test('the captions passed in override the defaults', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const promise = confirm.ask({ title: 'Leave?', text: 'Edits will be lost.', action: 'Leave', danger: false })
    expect(confirm.request.value).toMatchObject({ action: 'Leave', danger: false, text: 'Edits will be lost.' })
    confirm.cancel()
    await promise
  })

  test('a second request on top of the first leaves no promise hanging', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const first = confirm.ask({ title: 'First' })
    const second = confirm.ask({ title: 'Second' })

    expect(await first).toBe(false)
    confirm.confirm()
    expect(await second).toBe(true)
  })
})
