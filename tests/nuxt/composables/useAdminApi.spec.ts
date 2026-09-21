import { describe, test, expect } from 'vitest'

describe('adminError', () => {
  test('берёт сообщение из тела ответа H3', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ data: { message: 'Slug already exists' } })).toBe('Slug already exists')
  })

  test('без тела откатывается на statusMessage', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ statusMessage: 'Unauthorized' })).toBe('Unauthorized')
  })

  test('обычная ошибка JS показывается своим message', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError(new Error('Failed to fetch'))).toBe('Failed to fetch')
  })

  test('пустое сообщение не показывается пустотой', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError({ data: { message: '' }, statusMessage: 'Bad Request' })).toBe('Bad Request')
  })

  test('ни на что не похожее значение всё равно даёт текст для тоста', async () => {
    const { adminError } = await import('~/composables/useAdminApi')
    expect(adminError(undefined)).toBe('Unknown error')
    expect(adminError({})).toBe('Unknown error')
  })
})
