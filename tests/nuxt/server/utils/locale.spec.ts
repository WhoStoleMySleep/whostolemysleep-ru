import { describe, test, expect } from 'vitest'

describe('pick', () => {
  test('для en отдаёт английский вариант', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', 'english', 'en')).toBe('english')
  })

  test('для ru отдаёт русский, даже когда английский заполнен', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', 'english', 'ru')).toBe('русский')
  })

  test('пустой перевод не показывается пустотой — откат на русский', async () => {
    const { pick } = await import('~~/server/utils/locale')
    expect(pick('русский', '', 'en')).toBe('русский')
  })
})
