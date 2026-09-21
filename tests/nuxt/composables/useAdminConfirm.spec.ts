import { describe, test, expect } from 'vitest'

describe('useAdminConfirm', () => {
  test('подтверждение возвращает true, отказ — false', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const yes = confirm.ask({ title: 'Delete?' })
    confirm.confirm()
    expect(await yes).toBe(true)

    const no = confirm.ask({ title: 'Delete?' })
    confirm.cancel()
    expect(await no).toBe(false)
  })

  test('запрос виден снаружи и закрывается после ответа', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const promise = confirm.ask({ title: 'Delete post?' })
    expect(confirm.request.value).toMatchObject({ title: 'Delete post?', action: 'Delete', danger: true })

    confirm.cancel()
    await promise
    expect(confirm.request.value).toBeNull()
  })

  test('переданные подписи перекрывают значения по умолчанию', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const promise = confirm.ask({ title: 'Leave?', text: 'Edits will be lost.', action: 'Leave', danger: false })
    expect(confirm.request.value).toMatchObject({ action: 'Leave', danger: false, text: 'Edits will be lost.' })
    confirm.cancel()
    await promise
  })

  test('второй запрос поверх первого не оставляет висеть чужой промис', async () => {
    const { useAdminConfirm } = await import('~/composables/useAdminConfirm')
    const confirm = useAdminConfirm()

    const first = confirm.ask({ title: 'Первый' })
    const second = confirm.ask({ title: 'Второй' })

    expect(await first).toBe(false)
    confirm.confirm()
    expect(await second).toBe(true)
  })
})
