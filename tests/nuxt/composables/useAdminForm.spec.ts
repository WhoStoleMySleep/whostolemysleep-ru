import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { Ref } from 'vue'

interface About { text_ru: string }

const m = vi.hoisted(() => ({
  api:     { get: vi.fn(), patch: vi.fn(async () => ({})) },
  toast:   { ok: vi.fn(), err: vi.fn() },
  confirm: vi.fn(async () => true),
  refresh: vi.fn(async () => {}),
  data:    null as { value: unknown } | null,
  leave:   null as (() => unknown) | null,
}))

mockNuxtImport('useAsyncData', () => () => ({ data: m.data, refresh: m.refresh }))
mockNuxtImport('useAdminApi', () => () => m.api)
mockNuxtImport('useAdminToast', () => () => m.toast)
mockNuxtImport('useAdminConfirm', () => () => ({ ask: m.confirm }))
mockNuxtImport('onBeforeRouteLeave', () => (guard: () => unknown) => { m.leave = guard })

const mounted: { unmount: () => void }[] = []

function withSetup<T>(fn: () => T) {
  let out!: T
  const wrapper = mount(defineComponent({ setup() { out = fn(); return () => null } }))
  mounted.push(wrapper)
  return { out, wrapper }
}

async function form(toBody?: (f: { text: string }) => unknown) {
  const { useAdminForm } = await import('~/composables/useAdminForm')
  return withSetup(() => useAdminForm<About, { text: string }>({
    endpoint: '/api/admin/about',
    toForm:   (data) => ({ text: data.text_ru }),
    toBody,
    title:    'About',
  }))
}

beforeEach(() => {
  m.data = ref({ text_ru: 'исходный' }) as unknown as { value: unknown }
  m.leave = null
  m.api.patch.mockClear().mockResolvedValue({})
  m.toast.ok.mockClear()
  m.toast.err.mockClear()
  m.refresh.mockClear()
  m.confirm.mockClear().mockResolvedValue(true)
})

afterEach(() => {
  // Слушатели окна остаются на смонтированной странице и сработали бы в следующем тесте.
  mounted.splice(0).forEach((w) => w.unmount())
  vi.unstubAllGlobals()
})

describe('заполнение', () => {
  test('форма берёт значения из ответа и считается сохранённой', async () => {
    const { out } = await form()

    expect(out.form.value).toEqual({ text: 'исходный' })
    expect(out.dirty.value).toBe(false)
  })

  test('правка поля включает признак несохранённых изменений', async () => {
    const { out } = await form()
    out.form.value.text = 'правка'

    expect(out.dirty.value).toBe(true)
  })

  test('пустой ответ не затирает форму', async () => {
    m.data = ref(null) as unknown as { value: unknown }
    const { out } = await form()

    expect(out.form.value).toEqual({})
    expect(out.dirty.value).toBe(false)
  })

  test('новые данные с сервера становятся новым слепком', async () => {
    const { out } = await form()
    ;(m.data as unknown as Ref<About>).value = { text_ru: 'с сервера' }
    await nextTick()

    expect(out.form.value).toEqual({ text: 'с сервера' })
    expect(out.dirty.value).toBe(false)
  })
})

describe('сохранение', () => {
  test('уходит PATCH, признак изменений снимается, список перечитывается', async () => {
    const { out } = await form()
    out.form.value.text = 'правка'
    await out.save()

    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/about', { text: 'правка' })
    expect(out.dirty.value).toBe(false)
    expect(m.refresh).toHaveBeenCalled()
    expect(m.toast.ok).toHaveBeenCalledWith('About saved — added to cache queue')
  })

  test('toBody решает форму запроса', async () => {
    const { out } = await form((f) => ({ text_ru: f.text }))
    out.form.value.text = 'правка'
    await out.save()

    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/about', { text_ru: 'правка' })
  })

  test('ошибка не выдаёт правки за сохранённые', async () => {
    m.api.patch.mockRejectedValue({ data: { message: 'Unauthorized' } })
    const { out } = await form()
    out.form.value.text = 'правка'
    await out.save()

    expect(m.toast.err).toHaveBeenCalledWith('Unauthorized')
    expect(out.dirty.value).toBe(true)
    expect(out.saving.value).toBe(false)
  })
})

describe('защита правок', () => {
  test('Cmd+S сохраняет, когда есть что сохранять', async () => {
    const { out } = await form()
    out.form.value.text = 'правка'
    await nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    await nextTick()

    expect(m.api.patch).toHaveBeenCalled()
  })

  test('без изменений Cmd+S ничего не отправляет', async () => {
    await form()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
    await nextTick()

    expect(m.api.patch).not.toHaveBeenCalled()
  })

  test('закрытие вкладки с правками браузер переспрашивает', async () => {
    const { out } = await form()
    out.form.value.text = 'правка'
    await nextTick()

    const dirty = window.dispatchEvent(new Event('beforeunload', { cancelable: true }))
    expect(dirty).toBe(false)
  })

  test('уход со страницы без правок не спрашивает', async () => {
    await form()

    expect(m.leave?.()).toBe(true)
    expect(m.confirm).not.toHaveBeenCalled()
  })

  test('уход с правками требует подтверждения', async () => {
    const { out } = await form()
    out.form.value.text = 'правка'
    await nextTick()

    await expect(m.leave?.()).resolves.toBe(true)
    expect(m.confirm).toHaveBeenCalled()
  })

  test('размонтированная страница больше не слушает окно', async () => {
    const { out, wrapper } = await form()
    out.form.value.text = 'правка'
    await nextTick()
    wrapper.unmount()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    await nextTick()

    expect(m.api.patch).not.toHaveBeenCalled()
  })
})
