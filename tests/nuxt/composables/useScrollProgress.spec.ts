import { describe, test, expect, vi } from 'vitest'

describe('useScrollProgress', () => {
  test('no scroll and a page shorter than the window — progress 0, no division by zero', async () => {
    const { mount } = await import('@vue/test-utils')
    const { defineComponent } = await import('vue')
    const { useScrollProgress } = await import('~/composables/useScrollProgress')

    let out!: ReturnType<typeof useScrollProgress>
    const wrapper = mount(defineComponent({ setup() { out = useScrollProgress(); return () => null } }))

    expect(out.progress.value).toBe(0)
    wrapper.unmount()
  })

  test('scrolling to the end gives one', async () => {
    const { mount } = await import('@vue/test-utils')
    const { defineComponent } = await import('vue')
    const { useScrollProgress } = await import('~/composables/useScrollProgress')

    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1000)
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(5000)

    let out!: ReturnType<typeof useScrollProgress>
    const wrapper = mount(defineComponent({ setup() { out = useScrollProgress(); return () => null } }))
    window.dispatchEvent(new Event('scroll'))

    expect(out.progress.value).toBe(1)

    wrapper.unmount()
    vi.restoreAllMocks()
  })

  test('unmounting removes the listeners', async () => {
    const { mount } = await import('@vue/test-utils')
    const { defineComponent } = await import('vue')
    const { useScrollProgress } = await import('~/composables/useScrollProgress')

    const remove = vi.spyOn(window, 'removeEventListener')
    const wrapper = mount(defineComponent({ setup() { useScrollProgress(); return () => null } }))
    wrapper.unmount()

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
    remove.mockRestore()
  })
})
