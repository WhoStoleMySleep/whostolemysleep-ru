const STORAGE_KEY = 'wms-theme'

export const useTheme = () => {
  const isDark = useState('theme:isDark', () => true)

  function apply(dark: boolean) {
    isDark.value = dark
    if (!import.meta.client) return

    // Держать в согласии с --bg в app/assets/css/main.css и с
    // theme-color в nuxt.config.ts, иначе при загрузке мелькает старый фон.
    const bg = dark ? '#0a0a0c' : '#f4f1ec'
    const root = document.documentElement
    root.classList.toggle('light', !dark)
    root.style.backgroundColor = bg
    document.body.style.backgroundColor = bg

    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', bg)
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
