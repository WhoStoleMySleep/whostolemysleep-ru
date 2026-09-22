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
  m.data = ref({ text_ru: 'original' }) as unknown as { value: unknown }
  m.leave = null
  m.api.patch.mockClear().mockResolvedValue({})
  m.toast.ok.mockClear()
  m.toast.err.mockClear()
  m.refresh.mockClear()
  m.confirm.mockClear().mockResolvedValue(true)
})

afterEach(() => {
  // Window listeners stay on the mounted page and would fire during the next test.
  mounted.splice(0).forEach((w) => w.unmount())
  vi.unstubAllGlobals()
})

describe('filling in', () => {
  test('the form takes its values from the response and counts as saved', async () => {
    const { out } = await form()

    expect(out.form.value).toEqual({ text: 'original' })
    expect(out.dirty.value).toBe(false)
  })

  test('editing a field raises the unsaved-changes flag', async () => {
    const { out } = await form()
    out.form.value.text = 'edit'

    expect(out.dirty.value).toBe(true)
  })

  test('an empty response does not wipe the form', async () => {
    m.data = ref(null) as unknown as { value: unknown }
    const { out } = await form()

    expect(out.form.value).toEqual({})
    expect(out.dirty.value).toBe(false)
  })

  test('fresh data from the server becomes the new snapshot', async () => {
    const { out } = await form()
    ;(m.data as unknown as Ref<About>).value = { text_ru: 'from the server' }
    await nextTick()

    expect(out.form.value).toEqual({ text: 'from the server' })
    expect(out.dirty.value).toBe(false)
  })
})

describe('saving', () => {
  test('a PATCH goes out, the changes flag drops, the list is re-read', async () => {
    const { out } = await form()
    out.form.value.text = 'edit'
    await out.save()

    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/about', { text: 'edit' })
    expect(out.dirty.value).toBe(false)
    expect(m.refresh).toHaveBeenCalled()
    expect(m.toast.ok).toHaveBeenCalledWith('About saved — added to cache queue')
  })

  test('toBody decides the shape of the request', async () => {
    const { out } = await form((f) => ({ text_ru: f.text }))
    out.form.value.text = 'edit'
    await out.save()

    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/about', { text_ru: 'edit' })
  })

  test('an error does not pass edits off as saved', async () => {
    m.api.patch.mockRejectedValue({ data: { message: 'Unauthorized' } })
    const { out } = await form()
    out.form.value.text = 'edit'
    await out.save()

    expect(m.toast.err).toHaveBeenCalledWith('Unauthorized')
    expect(out.dirty.value).toBe(true)
    expect(out.saving.value).toBe(false)
  })
})

describe('protecting edits', () => {
  test('Cmd+S saves when there is something to save', async () => {
    const { out } = await form()
    out.form.value.text = 'edit'
    await nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    await nextTick()

    expect(m.api.patch).toHaveBeenCalled()
  })

  test('with no changes Cmd+S sends nothing', async () => {
    await form()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
    await nextTick()

    expect(m.api.patch).not.toHaveBeenCalled()
  })

  test('the browser asks again when a tab with edits is closed', async () => {
    const { out } = await form()
    out.form.value.text = 'edit'
    await nextTick()

    const dirty = window.dispatchEvent(new Event('beforeunload', { cancelable: true }))
    expect(dirty).toBe(false)
  })

  test('leaving the page with no edits asks nothing', async () => {
    await form()

    expect(m.leave?.()).toBe(true)
    expect(m.confirm).not.toHaveBeenCalled()
  })

  test('leaving with edits requires confirmation', async () => {
    const { out } = await form()
    out.form.value.text = 'edit'
    await nextTick()

    await expect(m.leave?.()).resolves.toBe(true)
    expect(m.confirm).toHaveBeenCalled()
  })

  test('an unmounted page no longer listens to the window', async () => {
    const { out, wrapper } = await form()
    out.form.value.text = 'edit'
    await nextTick()
    wrapper.unmount()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }))
    await nextTick()

    expect(m.api.patch).not.toHaveBeenCalled()
  })
})
