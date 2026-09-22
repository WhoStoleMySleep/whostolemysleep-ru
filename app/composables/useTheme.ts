const STORAGE_KEY = 'wms-theme'
/** Marks "an extension forced the dark theme". Kept in sessionStorage rather
 *  than localStorage: if the extension is switched off, the flag disappears with
 *  the tab instead of leaving the site dark forever. */
const EXT_KEY = 'wms-ext-dark'

// Keep in step with --bg in app/assets/css/main.css and with theme-color in
// nuxt.config.ts, otherwise the old background flashes during load.
const BG_DARK  = '#0a0a0c'
const BG_LIGHT = '#f4f1ec'

/** Duration of the wave. Set here and not in CSS: the circle is built from the
 *  button's coordinates and the whole animation runs through WAAPI. */
const WAVE_MS = 520

/**
 * The marks Dark Reader and its relatives leave on the page.
 * The attributes go on <html>, style.darkreader goes into <head>.
 */
const EXT_ATTRS = ['data-darkreader-scheme', 'data-darkreader-mode']

type ViewTransition = { ready: Promise<void>, finished: Promise<void> }
type VTDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition
}

/**
 * The extension was recognised at least once during this page load.
 *
 * A latch rather than a live check, on purpose. On detection we ask Dark Reader
 * to stand down (meta darkreader-lock), it removes its marks — and a live check
 * would immediately conclude "no extension", the site would go back to light,
 * and the extension would switch on again. An endless flicker loop.
 */
let extLatched  = false
/** The extension's marks were actually seen during this page load. */
let markersSeen = false
let listening   = false

export const useTheme = () => {
  const isDark = useState('theme:isDark', () => true)

  /** localStorage throws in private mode and wherever storage is blocked. */
  function readChoice(): 'dark' | 'light' | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === 'dark' || saved === 'light' ? saved : null
    } catch { return null }
  }

  function writeChoice(dark: boolean) {
    try { localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light') } catch { /* nothing to do */ }
  }

  function markExternal(on: boolean) {
    try {
      if (on) sessionStorage.setItem(EXT_KEY, '1')
      else sessionStorage.removeItem(EXT_KEY)
    } catch { /* nothing to do */ }
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
   * Ask the extension not to repaint the page: the site has a dark theme of its
   * own, and it beats any automatic filter. Dark Reader understands this tag;
   * the ones that do not will simply darken what is already dark.
   */
  function lockExternal() {
    if (document.querySelector('meta[name="darkreader-lock"]')) return
    const meta = document.createElement('meta')
    meta.name = 'darkreader-lock'
    document.head.appendChild(meta)
  }

  /** What should be on screen right now. */
  function resolveDark() {
    if (externalDark()) return true
    const choice = readChoice()
    if (choice) return choice === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  /** Paints the document without remembering anything. */
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

  /** A user's choice: paint it and remember it. */
  function apply(dark: boolean) {
    paint(dark)
    if (import.meta.client) writeChoice(dark)
  }

  /**
   * The wave starts at the centre of the button that was pressed. From the
   * keyboard there are no pointer coordinates (clientX/clientY arrive as zeros),
   * so the geometry comes from the button rather than from the event.
   * currentTarget is read synchronously: it is nulled once the handler returns.
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

    // Browsers without View Transitions, and anyone who turned animations off at
    // the system level, get an instant switch.
    if (typeof doc.startViewTransition !== 'function' || reduced) {
      apply(next)
      return
    }

    const { x, y } = waveOrigin(event)
    // Radius out to the furthest corner: the wave has to cover everything.
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
      .catch(() => { /* the snapshot failed — the theme is applied anyway */ })

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

    // The flag from the previous load: the critical script has already painted
    // the dark theme, so we hold it until the extension confirms itself with its
    // marks. No lock is set meanwhile — otherwise Dark Reader stays quiet, no
    // marks appear, and we conclude the extension is gone.
    try { extLatched = sessionStorage.getItem(EXT_KEY) === '1' } catch { /* nothing to do */ }

    paint(resolveDark())

    // The system theme (and extensions that switch it at the browser level) —
    // followed until the user picks a theme by hand.
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', sync)

    // Dark Reader arrives after the first paint: it puts its marks on <html> and
    // slips a <style> into <head>.
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: EXT_ATTRS })
    observer.observe(document.head, { childList: true })

    // The extension may have been switched off between loads. If it has not shown
    // itself within the grace period the latch is released, otherwise the site
    // would stay dark forever.
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
