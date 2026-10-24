import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

const m = vi.hoisted(() => ({
  confirm: vi.fn(async () => true),
  leave:   null as (() => unknown) | null,
}))

mockNuxtImport('useAdminConfirm', () => () => ({ ask: m.confirm }))
mockNuxtImport('onBeforeRouteLeave', () => (guard: () => unknown) => { m.leave = guard })

const mounted: { unmount: () => void }[] = []

async function guard(initiallyDirty: boolean) {
  const { useUnsavedGuard } = await import('~/composables/useUnsavedGuard')
  const dirty = ref(initiallyDirty)
  const save  = vi.fn()
  const wrapper = mount(defineComponent({ setup() { useUnsavedGuard({ dirty, save }); return () => null } }))
  mounted.push(wrapper)
  return { dirty, save, wrapper }
}

const pressSave = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }))

beforeEach(() => {
  m.leave = null
  m.confirm.mockClear().mockResolvedValue(true)
})

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
})

describe('useUnsavedGuard', () => {
  test('Cmd+S saves edits and keeps the browser dialog away', async () => {
    const { save } = await guard(true)
    const notPrevented = pressSave()

    expect(save).toHaveBeenCalledTimes(1)
    expect(notPrevented).toBe(false)
  })

  test('Cmd+S with nothing changed does not send a request', async () => {
    const { save } = await guard(false)
    pressSave()

    expect(save).not.toHaveBeenCalled()
  })

  test('closing the tab is held only while there are edits', async () => {
    const { dirty } = await guard(true)
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(false)

    dirty.value = false
    expect(window.dispatchEvent(new Event('beforeunload', { cancelable: true }))).toBe(true)
  })

  test('leaving a clean page does not ask', async () => {
    await guard(false)
    expect(await m.leave?.()).toBe(true)
    expect(m.confirm).not.toHaveBeenCalled()
  })

  test('leaving with edits asks and follows the answer', async () => {
    await guard(true)
    m.confirm.mockResolvedValue(false)

    expect(await m.leave?.()).toBe(false)
    expect(m.confirm).toHaveBeenCalledTimes(1)
  })

  test('an unmounted page no longer listens to the window', async () => {
    const { save, wrapper } = await guard(true)
    wrapper.unmount()
    pressSave()

    expect(save).not.toHaveBeenCalled()
  })
})
