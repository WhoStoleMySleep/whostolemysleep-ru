const STORAGE_KEY = 'wms-theme'

export const useTheme = () => {
  const isDark = useState('theme:isDark', () => true)

  function apply(dark: boolean) {
    isDark.value = dark
    if (!import.meta.client) return

    const bg = dark ? '#07070a' : '#f4efe6'
    const root = document.documentElement
    root.classList.toggle('light', !dark)
    root.style.backgroundColor = bg
    document.body.style.backgroundColor = bg

    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#07070a' : '#f4efe6')
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  }

  function toggle() { apply(!isDark.value) }

  function init() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(STORAGE_KEY)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    apply(saved ? saved === 'dark' : prefersDark)
  }

  return { isDark, toggle, init }
}
