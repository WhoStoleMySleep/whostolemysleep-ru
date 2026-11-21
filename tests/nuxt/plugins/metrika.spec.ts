// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const state = vi.hoisted(() => ({
  config: { metrikaId: '114450485', metrikaEnabled: true },
  route: { value: { path: '/ru' } },
  beforeEach: vi.fn(),
}))
mockNuxtImport('defineNuxtPlugin', () => (plugin: unknown) => plugin)
mockNuxtImport('useRuntimeConfig', () => () => ({ public: state.config }))
mockNuxtImport('useRouter', () => () => ({
  currentRoute: state.route, beforeEach: state.beforeEach,
  afterEach: () => () => {}, beforeResolve: () => () => {},
}))

const ym = vi.fn()
let hooks: Map<string, () => void>
let dispose: () => void
let guard: (to: { path: string }) => void
const removeGuard = vi.fn()

async function setup() {
  const { default: plugin } = await import('~/plugins/metrika.client')
  const run = plugin as unknown as (app: unknown) => void
  run({
    hook: (name: string, callback: () => void) => {
      hooks.set(name, callback)
      return () => hooks.delete(name)
    },
    vueApp: { onUnmount: (callback: () => void) => { dispose = callback } },
  })
  hooks.get('app:mounted')?.()
}

function loaded() {
  vi.stubGlobal('ym', ym)
  document.querySelector('script[src*="mc.yandex.ru"]')?.dispatchEvent(new Event('load'))
}

function navigate(path: string) {
  guard?.({ path })
  state.route.value = { path }
  hooks.get('page:finish')?.()
}

function click(href: string, goal?: string) {
  const link = document.createElement('a')
  link.href = href
  if (goal) link.dataset.metrikaGoal = goal
  link.innerHTML = '<span>Link</span>'
  document.body.append(link)
  // Prevent happy-dom navigation after the plugin has observed the click.
  document.addEventListener('click', event => event.preventDefault(), { once: true })
  link.firstElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

beforeEach(() => {
  hooks = new Map()
  dispose = () => {}
  state.config = { metrikaId: '114450485', metrikaEnabled: true }
  state.route.value = { path: '/ru' }
  state.beforeEach.mockImplementation((callback) => { guard = callback; return removeGuard })
  ym.mockReset()
  removeGuard.mockReset()
  vi.stubGlobal('location', { origin: 'https://whostolemysleep.ru' })
  vi.stubGlobal('ym', undefined)
  Object.defineProperty(document, 'referrer', { configurable: true, value: '' })
  document.title = 'Portfolio'
  const append = document.head.append.bind(document.head)
  // Simulate load/error ourselves without executing a real third-party counter.
  vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
    for (const node of nodes) {
      if (node instanceof HTMLScriptElement) node.type = 'application/json'
    }
    append(...nodes)
  })
})

afterEach(() => {
  dispose()
  document.head.querySelectorAll('script[src*="mc.yandex.ru"]').forEach(script => script.remove())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Метрика на публичном сайте', () => {
  test.each(['', 'abc', '-1', '1.5', 'Infinity'])('не загружается с некорректным ID %s', async (id) => {
    state.config.metrikaId = id
    await setup()
    expect(document.querySelector('script[src*="mc.yandex.ru"]')).toBeNull()
  })

  test.each(['http://localhost:3000', 'https://preview.vercel.app', 'https://www.whostolemysleep.ru'])('не работает на %s', async (origin) => {
    vi.stubGlobal('location', { origin })
    await setup()
    expect(hooks.size).toBe(0)
  })

  test('выключена вне production даже на основном домене', async () => {
    state.config.metrikaEnabled = false
    await setup()
    expect(hooks.size).toBe(0)
  })

  test.each(['/admin', '/admin/posts', '/_docs/scalar', '/'])('не загружается на %s', async (path) => {
    state.route.value = { path }
    await setup()
    expect(document.querySelector('script[src*="mc.yandex.ru"]')).toBeNull()
    expect(ym).not.toHaveBeenCalled()
  })

  test('инициализируется без автоматических просмотров и записи сессий', async () => {
    await setup()
    expect(ym).not.toHaveBeenCalled()
    loaded()
    expect(ym).toHaveBeenNthCalledWith(1, 114450485, 'init', {
      defer: true, webvisor: false, clickmap: false, trackLinks: false,
      trackHash: false, accurateTrackBounce: false, ecommerce: false,
    })
    expect(ym).toHaveBeenNthCalledWith(2, 114450485, 'hit', 'https://whostolemysleep.ru/ru', {
      referer: '', title: 'Portfolio',
    })
  })

  test('отправляет переходы и смену языка, но не повтор того же пути', async () => {
    await setup()
    loaded()
    navigate('/ru')
    navigate('/ru/blog')
    navigate('/en/blog')
    expect(ym.mock.calls.filter(([, method]) => method === 'hit')).toHaveLength(3)
    expect(ym).toHaveBeenLastCalledWith(114450485, 'hit', 'https://whostolemysleep.ru/en/blog', {
      referer: 'https://whostolemysleep.ru/ru/blog', title: 'Portfolio',
    })
    expect(document.querySelectorAll('script[src*="mc.yandex.ru"]')).toHaveLength(1)
  })

  test('выключается до входа в админку и возобновляется без приватного referrer', async () => {
    await setup()
    loaded()
    guard({ path: '/admin' })
    expect(ym).toHaveBeenLastCalledWith(114450485, 'destruct')
    navigate('/admin')
    click('mailto:private@example.com')
    expect(ym).toHaveBeenLastCalledWith(114450485, 'destruct')
    navigate('/en')
    expect(ym).toHaveBeenLastCalledWith(114450485, 'hit', 'https://whostolemysleep.ru/en', {
      referer: '', title: 'Portfolio',
    })
  })

  test('не инициализируется, если скрипт догрузился уже в админке', async () => {
    await setup()
    navigate('/admin/posts')
    loaded()
    expect(ym).not.toHaveBeenCalled()
    navigate('/ru')
    expect(ym).toHaveBeenCalledWith(114450485, 'hit', 'https://whostolemysleep.ru/ru', expect.any(Object))
  })

  test.each([
    ['https://example.com/article?email=secret#private', 'https://example.com/article'],
    ['https://whostolemysleep.ru/ru?token=secret', 'https://whostolemysleep.ru/ru'],
    ['https://whostolemysleep.ru/admin/posts?token=secret', ''],
    ['not a url', ''],
  ])('очищает referrer %s', async (referrer, expected) => {
    Object.defineProperty(document, 'referrer', { configurable: true, value: referrer })
    await setup()
    loaded()
    expect(ym).toHaveBeenLastCalledWith(114450485, 'hit', expect.any(String), {
      referer: expected, title: 'Portfolio',
    })
  })

  test('отправляет только имена целей без адресов и текста ссылок', async () => {
    await setup()
    loaded()
    click('mailto:secret@example.com?subject=private')
    click('https://t.me/example')
    click('https://github.com/example/project?secret=1', 'project_open')
    click('https://github.com/example')
    click('https://example.com')
    expect(ym.mock.calls.filter(([, method]) => method === 'reachGoal')).toEqual([
      [114450485, 'reachGoal', 'contact_email'],
      [114450485, 'reachGoal', 'contact_telegram'],
      [114450485, 'reachGoal', 'project_open'],
    ])
  })

  test('блокировка скрипта не мешает переходам и не накапливает события', async () => {
    await setup()
    document.querySelector('script[src*="mc.yandex.ru"]')!.dispatchEvent(new Event('error'))
    navigate('/ru/blog')
    click('mailto:example@example.com')
    expect(ym).not.toHaveBeenCalled()
    expect(document.querySelectorAll('script[src*="mc.yandex.ru"]')).toHaveLength(1)
  })

  test('отписывается от хуков и кликов при уничтожении приложения', async () => {
    await setup()
    loaded()
    dispose()
    ym.mockClear()
    click('mailto:example@example.com')
    loaded()
    expect(ym).not.toHaveBeenCalled()
    expect(removeGuard).toHaveBeenCalledOnce()
    expect(hooks.size).toBe(0)
  })
})
