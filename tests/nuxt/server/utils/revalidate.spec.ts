import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NUXT_PUBLIC_SITE_URL', 'https://site.test')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('revalidatePaths outside Vercel', () => {
  test('it clears the Nitro storage — the cache lives next to the server', async () => {
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

describe('revalidatePaths on Vercel', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('ISR_BYPASS_TOKEN', 'secret')
  })

  test('an empty list never hits the network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('$fetch', fetchMock)

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    expect(await revalidatePaths([])).toEqual({ revalidated: [], failed: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('it requests the page by absolute address with the token in the header', async () => {
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

  test('a failed path lands in failed with its status code, the rest in revalidated', async () => {
    vi.stubGlobal('$fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/en/blog')) throw Object.assign(new Error('nope'), { statusCode: 403 })
      return ''
    }))

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    const res = await revalidatePaths(['/ru/blog', '/en/blog'])

    expect(res.revalidated).toEqual(['/ru/blog'])
    expect(res.failed).toEqual([{ path: '/en/blog', reason: 'HTTP 403' }])
  })

  test('with no token it throws instead of reporting success', async () => {
    vi.stubEnv('ISR_BYPASS_TOKEN', '')
    vi.stubGlobal('$fetch', vi.fn())

    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    await expect(revalidatePaths(['/ru'])).rejects.toThrow(/ISR_BYPASS_TOKEN/)
  })
})

describe('Ожидаемый 404 при обновлении ISR', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('ISR_BYPASS_TOKEN', 'secret')
  })

  test('404 подтверждённой удалённой страницы считается завершённым обновлением', async () => {
    const request = vi.fn().mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 404 }))
    vi.stubGlobal('$fetch', request)
    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    expect(await revalidatePaths(['/ru/blog/deleted'], ['/ru/blog/deleted'])).toEqual({ revalidated: ['/ru/blog/deleted'], failed: [] })
    expect(request).toHaveBeenCalledWith('https://site.test/ru/blog/deleted', expect.objectContaining({ timeout: 10_000, retry: 0 }))
  })

  test('неожиданный 404 не скрывается', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(Object.assign(new Error('Missing'), { statusCode: 404 })))
    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    expect(await revalidatePaths(['/ru/blog/published'])).toEqual({ revalidated: [], failed: [{ path: '/ru/blog/published', reason: 'HTTP 404' }] })
  })

  test('500 не скрывается даже для удалённой страницы', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(Object.assign(new Error('Unavailable'), { statusCode: 500 })))
    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    expect((await revalidatePaths(['/ru/blog/deleted'], ['/ru/blog/deleted'])).failed).toEqual([{ path: '/ru/blog/deleted', reason: 'HTTP 500' }])
  })

  test('сетевой сбой остаётся доступным для повторной попытки', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('Timeout')))
    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    expect((await revalidatePaths(['/ru'])).failed).toEqual([{ path: '/ru', reason: 'Error: Timeout' }])
  })

  test('ограничивает параллелизм и обрабатывает все страницы очереди', async () => {
    let active = 0
    let peak = 0
    const request = vi.fn(async () => {
      peak = Math.max(peak, ++active)
      await Promise.resolve()
      active--
      return ''
    })
    vi.stubGlobal('$fetch', request)
    const paths = Array.from({ length: 15 }, (_, index) => `/ru/blog/post-${index}`)
    const { revalidatePaths } = await import('~~/server/utils/revalidate')
    expect(await revalidatePaths(paths)).toEqual({ revalidated: paths, failed: [] })
    expect(request).toHaveBeenCalledTimes(15)
    expect(peak).toBe(6)
  })
})
