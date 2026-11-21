type Metrika = (id: number, method: string, ...args: unknown[]) => void

const SCRIPT_URL = 'https://mc.yandex.ru/metrika/tag.js'
const SITE_ORIGIN = 'https://whostolemysleep.ru'

function isPublicPath(path: string) {
  return /^\/(ru|en)(\/|$)/.test(path)
}

function publicUrl(value: string) {
  if (!value) return ''
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol)) return ''
    if (url.origin === SITE_ORIGIN && !isPublicPath(url.pathname)) return ''
    return `${url.origin}${url.pathname}`
  } catch {
    return ''
  }
}

function goalFor(link: HTMLAnchorElement) {
  if (link.protocol === 'mailto:') return 'contact_email'
  if (link.hostname === 't.me' && link.protocol === 'https:') return 'contact_telegram'
  if (link.dataset.metrikaGoal === 'project_open') return 'project_open'
  return ''
}

/** Manual hits keep Nuxt navigation, private routes and sensitive URL parameters out of automatic tracking. */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public
  const id = Number(config.metrikaId)
  if (!config.metrikaEnabled || location.origin !== SITE_ORIGIN) return
  if (!Number.isSafeInteger(id) || id <= 0) return

  const router = useRouter()
  const target = window as Window & { ym?: Metrika }
  let script: HTMLScriptElement | undefined
  let ready = false
  let mounted = false
  let disposed = false
  let active = false
  let previous = publicUrl(document.referrer)
  let lastPath = ''

  function destroy() {
    if (active) target.ym?.(id, 'destruct')
    active = false
    lastPath = ''
  }

  function sendHit() {
    if (!ready || !target.ym || disposed) return
    if (!active) {
      target.ym(id, 'init', {
        defer: true, webvisor: false, clickmap: false, trackLinks: false,
        trackHash: false, accurateTrackBounce: false, ecommerce: false,
      })
      active = true
    }
    const path = router.currentRoute.value.path
    if (lastPath === path) return
    const url = `${SITE_ORIGIN}${path}`
    target.ym(id, 'hit', url, { referer: previous, title: document.title })
    previous = url
    lastPath = path
  }

  function loadScript() {
    if (script) return
    if (!target.ym) {
      const queue: unknown[][] = []
      target.ym = Object.assign((...args: unknown[]) => { queue.push(args) }, { a: queue, l: Date.now() })
    }
    script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => { ready = true; syncRoute() }
    // A blocked counter must not break navigation or keep accumulating queued events.
    script.onerror = () => { ready = false }
    document.head.append(script)
  }

  function syncRoute() {
    if (!mounted || disposed) return
    if (!isPublicPath(router.currentRoute.value.path)) {
      destroy()
      previous = ''
      return
    }
    loadScript()
    sendHit()
  }

  function trackClick(event: MouseEvent) {
    if (!active || event.button !== 0 || !isPublicPath(router.currentRoute.value.path)) return
    if (!(event.target instanceof Element)) return
    const link = event.target.closest('a')
    if (!(link instanceof HTMLAnchorElement)) return
    const goal = goalFor(link)
    if (goal) target.ym?.(id, 'reachGoal', goal)
  }

  const unhookMounted = nuxtApp.hook('app:mounted', () => { mounted = true; syncRoute() })
  const unhookPage = nuxtApp.hook('page:finish', syncRoute)
  // Stop the active counter before the admin page renders, not after its transition.
  const removeGuard = router.beforeEach((to) => {
    if (!isPublicPath(to.path)) { destroy(); previous = '' }
  })
  document.addEventListener('click', trackClick)

  function dispose() {
    disposed = true
    destroy()
    unhookMounted()
    unhookPage()
    removeGuard()
    document.removeEventListener('click', trackClick)
    script?.remove()
  }

  nuxtApp.vueApp.onUnmount(dispose)
  if (import.meta.hot) import.meta.hot.dispose(dispose)
})
