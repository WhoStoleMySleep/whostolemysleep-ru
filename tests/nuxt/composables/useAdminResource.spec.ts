import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

interface Item { id: number, name: string }

const m = vi.hoisted(() => ({
  items:   [] as { id: number, name: string }[],
  status:  'success' as string,
  api:     {
    get:    vi.fn(),
    post:   vi.fn(async () => ({})),
    patch:  vi.fn(async () => ({})),
    remove: vi.fn(async () => ({})),
  },
  toast:   { ok: vi.fn(), err: vi.fn() },
  confirm: vi.fn(async () => true),
  refresh: vi.fn(async () => {}),
  data:    null as { value: unknown } | null,
}))

mockNuxtImport('useAsyncData', () => () => ({ data: m.data, status: ref(m.status), refresh: m.refresh }))
mockNuxtImport('useAdminApi', () => () => m.api)
mockNuxtImport('useAdminToast', () => () => m.toast)
mockNuxtImport('useAdminConfirm', () => () => ({ ask: m.confirm }))

/** The composable registers lifecycle hooks, so it is called inside a component. */
function withSetup<T>(fn: () => T): T {
  let out!: T
  mount(defineComponent({ setup() { out = fn(); return () => null } }))
  return out
}

async function resource(toBody?: (form: { name: string }) => unknown) {
  const { useAdminResource } = await import('~/composables/useAdminResource')
  return withSetup(() => useAdminResource<Item, { name: string }>({
    endpoint: '/api/admin/education',
    blank:    () => ({ name: '' }),
    toForm:   (item) => ({ name: item.name }),
    toBody,
    title:    'Education',
  }))
}

beforeEach(() => {
  m.items  = [{ id: 1, name: 'one' }, { id: 2, name: 'two' }]
  m.status = 'success'
  m.data   = ref(m.items) as unknown as { value: unknown }
  m.api.post.mockClear().mockResolvedValue({})
  m.api.patch.mockClear().mockResolvedValue({})
  m.api.remove.mockClear().mockResolvedValue({})
  m.toast.ok.mockClear()
  m.toast.err.mockClear()
  m.refresh.mockClear()
  m.confirm.mockClear().mockResolvedValue(true)
})

describe('form state', () => {
  test('the list comes from useAsyncData, the loading flag from its status', async () => {
    const r = await resource()
    expect(r.items.value).toHaveLength(2)
    expect(r.loading.value).toBe(false)

    m.status = 'pending'
    expect((await resource()).loading.value).toBe(true)
  })

  test('a new entry opens an empty form', async () => {
    const r = await resource()
    r.startNew()

    expect(r.isNew.value).toBe(true)
    expect(r.editing.value).toBe(true)
    expect(r.form.value).toEqual({ name: '' })
  })

  test('editing fills the form with the entry', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'two' })

    expect(r.isNew.value).toBe(false)
    expect(r.editId.value).toBe(2)
    expect(r.form.value).toEqual({ name: 'two' })
  })

  test('cancelling closes the form', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'two' })
    r.cancel()

    expect(r.editing.value).toBe(false)
  })
})

describe('saving', () => {
  test('a new entry goes out as POST, the form closes, the list refreshes', async () => {
    const r = await resource()
    r.startNew()
    r.form.value.name = 'three'
    await r.save()

    expect(m.api.post).toHaveBeenCalledWith('/api/admin/education', { name: 'three' })
    expect(m.refresh).toHaveBeenCalled()
    expect(r.editing.value).toBe(false)
    expect(m.toast.ok).toHaveBeenCalledWith('Education saved')
  })

  test('an existing one goes out as PATCH to its own address', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'two' })
    await r.save()

    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/education/2', { name: 'two' })
    expect(m.api.post).not.toHaveBeenCalled()
  })

  test('toBody decides what goes into the request', async () => {
    const r = await resource((form) => ({ institution: form.name }))
    r.startNew()
    r.form.value.name = 'University'
    await r.save()

    expect(m.api.post).toHaveBeenCalledWith('/api/admin/education', { institution: 'University' })
  })

  test('an error shows as a toast and the form stays open — no edits are lost', async () => {
    m.api.patch.mockRejectedValue({ data: { message: 'Slug already exists' } })
    const r = await resource()
    r.startEdit({ id: 2, name: 'two' })
    await r.save()

    expect(m.toast.err).toHaveBeenCalledWith('Slug already exists')
    expect(r.editId.value).toBe(2)
    expect(r.saving.value).toBe(false)
  })
})

describe('deleting', () => {
  test('it asks for confirmation and deletes nothing without it', async () => {
    m.confirm.mockResolvedValue(false)
    const r = await resource()
    await r.remove({ id: 2, name: 'two' })

    expect(m.api.remove).not.toHaveBeenCalled()
  })

  test('it deletes, closes the open form of that same entry and refreshes the list', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'two' })
    await r.remove({ id: 2, name: 'two' }, 'two')

    expect(m.api.remove).toHaveBeenCalledWith('/api/admin/education/2')
    expect(r.editId.value).toBe(null)
    expect(m.refresh).toHaveBeenCalled()
    expect(m.toast.ok).toHaveBeenCalledWith('Education deleted')
  })

  test('the form of a different entry stays open', async () => {
    const r = await resource()
    r.startEdit({ id: 1, name: 'one' })
    await r.remove({ id: 2, name: 'two' })

    expect(r.editId.value).toBe(1)
  })

  test('a failed delete is a toast, not silence', async () => {
    m.api.remove.mockRejectedValue(new Error('Failed to fetch'))
    const r = await resource()
    await r.remove({ id: 2, name: 'two' })

    expect(m.toast.err).toHaveBeenCalledWith('Failed to fetch')
  })
})

describe('ordering', () => {
  test('it changes at once and the request goes out as a list of ids', async () => {
    const r = await resource()
    await r.reorder([2, 1])

    expect(r.items.value.map((i) => i.id)).toEqual([2, 1])
    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/education/reorder', { ids: [2, 1] })
  })

  test('a failed request restores the previous order', async () => {
    m.api.patch.mockRejectedValue({ statusMessage: 'Unauthorized' })
    const r = await resource()
    await r.reorder([2, 1])

    expect(r.items.value.map((i) => i.id)).toEqual([1, 2])
    expect(m.toast.err).toHaveBeenCalledWith('Unauthorized')
  })

  test('unknown ids are dropped and the list gets no holes', async () => {
    const r = await resource()
    await r.reorder([2, 99])

    expect(r.items.value.map((i) => i.id)).toEqual([2])
  })
})
