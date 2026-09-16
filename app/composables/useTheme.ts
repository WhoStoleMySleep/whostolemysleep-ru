const STORAGE_KEY = 'wms-theme'
/** Флаг «тему навязало расширение». Живёт в sessionStorage, а не в
 *  localStorage: если расширение выключат, флаг сам исчезнет вместе с
 *  вкладкой, и сайт не останется тёмным навсегда. */
const EXT_KEY = 'wms-ext-dark'

// Держать в согласии с --bg в app/assets/css/main.css и с
// theme-color в nuxt.config.ts, иначе при загрузке мелькает старый фон.
const BG_DARK  = '#0a0a0c'
const BG_LIGHT = '#f4f1ec'

/** Длительность волны. Задаётся здесь, а не в CSS: круг строится из
 *  координат кнопки, и всю анимацию гоняет WAAPI. */
const WAVE_MS = 520

/**
 * Метки, которые Dark Reader и его аналоги оставляют на странице.
 * Атрибуты ставятся на <html>, style.darkreader — в <head>.
 */
const EXT_ATTRS = ['data-darkreader-scheme', 'data-darkreader-mode']

type ViewTransition = { ready: Promise<void>, finished: Promise<void> }
type VTDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition
}

/**
 * Расширение опознано хотя бы раз за эту загрузку страницы.
 *
 * Защёлка, а не живая проверка, намеренно. Мы в ответ на обнаружение
 * просим Dark Reader отключиться (meta darkreader-lock), он убирает свои
 * метки — и живая проверка тут же сказала бы «расширения нет», сайт
 * вернулся бы к светлой теме, расширение включилось бы снова. Вышел бы
 * бесконечный мигающий цикл.
 */
let extLatched  = false
/** Метки расширения реально видели в этой загрузке страницы. */
let markersSeen = false
let listening   = false

export const useTheme = () => {
  const isDark = useState('theme:isDark', () => true)

  /** localStorage падает в приватном режиме и при запрете хранилища. */
  function readChoice(): 'dark' | 'light' | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === 'dark' || saved === 'light' ? saved : null
    } catch { return null }
  }

  function writeChoice(dark: boolean) {
    try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light') } catch { /* нечего делать */ }
  }

  function markExternal(on: boolean) {
    try {
      if (on) sessionStorage.setItem(EXT_KEY, '1')
      else sessionStorage.removeItem(EXT_KEY)
    } catch { /* нечего делать */ }
  }

  function markersPresent() {
    return EXT_ATTRS.some(attr => document.documentElement.hasAttribute(attr))
      || !!document.querySelector('style.darkreader')
  }

  function externalDark() {
    if (markersPresent()) {
      markersSeen = true
      extLatched  = true
      markExternal(true)
      lockExternal()
    }
    return extLatched
  }

  /**
   * Просим расширение не перекрашивать страницу: у сайта есть своя
   * тёмная тема, и она лучше любого автоматического фильтра. Dark Reader
   * понимает этот тег; те, кто не понимает, просто затемнят уже тёмное.
   */
  function lockExternal() {
    if (document.querySelector('meta[name="darkreader-lock"]')) return
    const meta = document.createElement('meta')
    meta.name = 'darkreader-lock'
    document.head.appendChild(meta)
  }

  /** Что должно быть на экране прямо сейчас. */
  function resolveDark() {
    if (externalDark()) return true
    const choice = readChoice()
    if (choice) return choice === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  /** Красит документ, ничего не запоминая. */
  function paint(dark: boolean) {
    isDark.value = dark
    if (!import.meta.client) return

    const bg = dark ? BG_DARK : BG_LIGHT
    const root = document.documentElement
    root.classList.toggle('light', !dark)
    root.style.backgroundColor = bg
    document.body.style.backgroundColor = bg

    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', bg)
  }

  /** Выбор пользователя: красим и запоминаем. */
  function apply(dark: boolean) {
    paint(dark)
    if (import.meta.client) writeChoice(dark)
  }

  /**
   * Центр волны — середина нажатой кнопки. С клавиатуры координат курсора
   * нет (clientX/clientY приходят нулями), поэтому берём геометрию самой
   * кнопки, а не событие. currentTarget читается синхронно: после выхода
   * из обработчика он обнуляется.
   */
  function waveOrigin(event?: Event) {
    const target = event?.currentTarget
    if (target instanceof Element) {
      const rect = target.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  function toggle(event?: Event) {
    const next = !isDark.value
    if (!import.meta.client) { isDark.value = next; return }

    const doc  = document as VTDocument
    const root = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Браузеры без View Transitions, а также те, кто отключил анимации
    // в системе, получают мгновенное переключение.
    if (typeof doc.startViewTransition !== 'function' || reduced) {
      apply(next)
      return
    }

    const { x, y } = waveOrigin(event)
    // Радиус до самого дальнего угла экрана: волна должна накрыть всё.
    const radius = Math.hypot(
      Math.max(x, window.innerWidth  - x),
      Math.max(y, window.innerHeight - y),
    )

    root.classList.add('theme-wave')

    const transition = doc.startViewTransition(() => { apply(next) })

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: WAVE_MS,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => { /* снимок не сделался — тема уже применена */ })

    transition.finished
      .catch(() => {})
      .then(() => root.classList.remove('theme-wave'))
  }

  function sync() {
    const dark = resolveDark()
    if (dark !== isDark.value) paint(dark)
  }

  function init() {
    if (!import.meta.client || listening) return
    listening = true

    // Флаг прошлой загрузки: критический скрипт уже отрисовал тёмную тему,
    // держим её, пока расширение не подтвердит себя метками. Замок при этом
    // не ставим — иначе Dark Reader промолчит, меток не будет и мы решим,
    // что расширение убрали.
    try { extLatched = sessionStorage.getItem(EXT_KEY) === '1' } catch { /* нечего делать */ }

    paint(resolveDark())

    // Системная тема (и расширения, которые переключают её на уровне
    // браузера) — следуем за ней, пока пользователь не выбрал тему руками.
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', sync)

    // Dark Reader приходит позже первой отрисовки: свои метки он ставит
    // на <html> и подмешивает <style> в <head>.
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: EXT_ATTRS })
    observer.observe(document.head, { childList: true })

    // Расширение могли выключить между загрузками. Если за отведённое время
    // оно себя так и не показало — снимаем защёлку, иначе сайт остался бы
    // тёмным навсегда.
    if (extLatched && !markersSeen) {
      window.setTimeout(() => {
        if (markersSeen) return
        extLatched = false
        markExternal(false)
        sync()
      }, 3000)
    }
  }

  return { isDark, toggle, init }
}
