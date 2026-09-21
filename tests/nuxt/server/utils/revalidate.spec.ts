import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://site.test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('revalidatePaths вне Vercel', () => {
  test('чистит хранилище Nitro — кеш лежит рядом с сервером', async () => {
    vi.stubEnv('VERCEL', '')
    const removeItem = vi.fn()
    vi.stubGlobal('useStorage', () => ({
      getKeys:    async () => ['nitro:handlers:a', 'nitro:handlers:b'],
      removeItem,
    }))

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    const res = await revalidatePaths(['/ru/blog'])

    expect(removeItem).toHaveBeenCalledTimes(2)
    expect(res).toEqual({ revalidated: ['/ru/blog'], failed: [] })
  })
})

describe('revalidatePaths на Vercel', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('ISR_BYPASS_TOKEN', 'secret')
  })

  test('пустой список не ходит в сеть', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('$fetch', fetchMock)

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    expect(await revalidatePaths([])).toEqual({ revalidated: [], failed: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('запрашивает страницу по абсолютному адресу с токеном в заголовке', async () => {
    const fetchMock = vi.fn(async () => '')
    vi.stubGlobal('$fetch', fetchMock)

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    const res = await revalidatePaths(['/ru/blog'])

    expect(fetchMock).toHaveBeenCalledWith(
      'https://site.test/ru/blog',
      expect.objectContaining({ headers: { 'x-prerender-revalidate': 'secret' } }),
    )
    expect(res.revalidated).toEqual(['/ru/blog'])
  })

  test('упавший путь попадает в failed с кодом ответа, остальные — в revalidated', async () => {
    vi.stubGlobal('$fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/en/blog')) throw Object.assign(new Error('nope'), { statusCode: 403 })
      return ''
    }))

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    const res = await revalidatePaths(['/ru/blog', '/en/blog'])

    expect(res.revalidated).toEqual(['/ru/blog'])
    expect(res.failed).toEqual([{ path: '/en/blog', reason: 'HTTP 403' }])
  })

  test('без токена бросает ошибку, а не отчитывается об успехе', async () => {
    vi.stubEnv('ISR_BYPASS_TOKEN', '')
    vi.stubGlobal('$fetch', vi.fn())

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    await expect(revalidatePaths(['/ru'])).rejects.toThrow(/ISR_BYPASS_TOKEN/)
  })
})
