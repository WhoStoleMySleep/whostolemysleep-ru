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
  test('сохранённый выбор сильнее системной темы', async () => {
    localStorage.setItem('wms-theme', 'light')
    stubMatchMedia({ dark: true })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  test('без выбора берётся системная тема', async () => {
    stubMatchMedia({ dark: true })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  test('метки Dark Reader перевешивают всё и просят расширение отступить', async () => {
    localStorage.setItem('wms-theme', 'light')
    document.documentElement.setAttribute('data-darkreader-scheme', 'dark')

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(true)
    expect(document.querySelector('meta[name="darkreader-lock"]')).not.toBeNull()
    expect(sessionStorage.getItem('wms-ext-dark')).toBe('1')
  })

  test('мусор в localStorage игнорируется как отсутствие выбора', async () => {
    localStorage.setItem('wms-theme', 'неонка')
    stubMatchMedia({ dark: true })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()

    expect(theme.isDark.value).toBe(true)
  })
})

describe('useTheme.toggle', () => {
  test('переключение красит документ и запоминает выбор', async () => {
    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()
    expect(theme.isDark.value).toBe(false)

    theme.toggle()

    expect(theme.isDark.value).toBe(true)
    expect(localStorage.getItem('wms-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  test('цвет фона и theme-color меняются вместе с темой', async () => {
    document.head.innerHTML = '<meta name="theme-color" content="#0a0a0c">'

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()
    theme.init()
    theme.toggle()

    expect(document.documentElement.style.backgroundColor).not.toBe('')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#0a0a0c')
  })

  test('при отключённых анимациях переключение мгновенное, без волны', async () => {
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

  test('недоступное хранилище не роняет переключение', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    const { useTheme } = await import('~/composables/useTheme')
    const theme = useTheme()

    expect(() => theme.toggle()).not.toThrow()
    setItem.mockRestore()
  })
})
