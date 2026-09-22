import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

function stubMatchMedia({ dark = false, reduced = false } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches:             query.includes('prefers-color-scheme: dark') ? dark : reduced,
    media:               query,
    addEventListener:    () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  sessionStorage.clear()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-darkreader-scheme')
  document.head.innerHTML = ''
  stubMatchMedia()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTheme.init', () => {
  test('a saved choice outweighs the system theme', async () => {
    localStorage.setItem('wms-theme', 'light')
    stubMatchMedia({ dark: true })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  test('with no choice the system theme is used', async () => {
    stubMatchMedia({ dark: true })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  test('Dark Reader markers outweigh everything and ask the extension to back off', async () => {
    localStorage.setItem('wms-theme', 'light')
    document.documentElement.setAttribute('data-darkreader-scheme', 'dark')

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(true)
    expect(document.querySelector('meta[name="darkreader-lock"]')).not.toBeNull()
    expect(sessionStorage.getItem('wms-ext-dark')).toBe('1')
  })

  test('garbage in localStorage is ignored as no choice at all', async () => {
    localStorage.setItem('wms-theme', 'neon')
    stubMatchMedia({ dark: true })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(true)
  })
})

describe('useTheme.toggle', () => {
  test('toggling paints the document and remembers the choice', async () => {
    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()
    expect(theme.isDark.value).toBe(false)

    theme.toggle()

    expect(theme.isDark.value).toBe(true)
    expect(localStorage.getItem('wms-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  test('the background colour and theme-color change together with the theme', async () => {
    document.head.innerHTML = '<meta name="theme-color" content="#0a0a0c">'

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()
    theme.toggle()

    expect(document.documentElement.style.backgroundColor).not.toBe('')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0a0a0c')
  })

  test('with animations disabled the switch is instant, with no wave', async () => {
    stubMatchMedia({ reduced: true })

    const startViewTransition = vi.fn()
    Object.defineProperty(document, 'startViewTransition', { value: startViewTransition, configurable: true })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()
    theme.toggle()

    expect(startViewTransition).not.toHaveBeenCalled()
    expect(document.documentElement.classList.contains('theme-wave')).toBe(false)

    Reflect.deleteProperty(document, 'startViewTransition')
  })

  test('unavailable storage does not break the switch', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()

    expect(() => theme.toggle()).not.toThrow()
    setItem.mockRestore()
  })
})
