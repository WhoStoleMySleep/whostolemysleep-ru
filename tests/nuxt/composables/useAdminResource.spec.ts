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

/** Композабл вешает хуки жизненного цикла, поэтому вызывается внутри компонента. */
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
  m.items  = [{ id: 1, name: 'один' }, { id: 2, name: 'два' }]
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

describe('состояние формы', () => {
  test('список приходит из useAsyncData, загрузка — из его статуса', async () => {
    const r = await resource()
    expect(r.items.value).toHaveLength(2)
    expect(r.loading.value).toBe(false)

    m.status = 'pending'
    expect((await resource()).loading.value).toBe(true)
  })

  test('новая запись открывает пустую форму', async () => {
    const r = await resource()
    r.startNew()

    expect(r.isNew.value).toBe(true)
    expect(r.editing.value).toBe(true)
    expect(r.form.value).toEqual({ name: '' })
  })

  test('редактирование заполняет форму записью', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'два' })

    expect(r.isNew.value).toBe(false)
    expect(r.editId.value).toBe(2)
    expect(r.form.value).toEqual({ name: 'два' })
  })

  test('отмена закрывает форму', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'два' })
    r.cancel()

    expect(r.editing.value).toBe(false)
  })
})

describe('сохранение', () => {
  test('новая запись уходит POST, форма закрывается, список обновляется', async () => {
    const r = await resource()
    r.startNew()
    r.form.value.name = 'три'
    await r.save()

    expect(m.api.post).toHaveBeenCalledWith('/api/admin/education', { name: 'три' })
    expect(m.refresh).toHaveBeenCalled()
    expect(r.editing.value).toBe(false)
    expect(m.toast.ok).toHaveBeenCalledWith('Education saved')
  })

  test('существующая уходит PATCH на свой адрес', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'два' })
    await r.save()

    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/education/2', { name: 'два' })
    expect(m.api.post).not.toHaveBeenCalled()
  })

  test('toBody решает, что уходит в запрос', async () => {
    const r = await resource((form) => ({ institution: form.name }))
    r.startNew()
    r.form.value.name = 'ВУЗ'
    await r.save()

    expect(m.api.post).toHaveBeenCalledWith('/api/admin/education', { institution: 'ВУЗ' })
  })

  test('ошибка показывается тостом, форма остаётся открытой — правки не теряются', async () => {
    m.api.patch.mockRejectedValue({ data: { message: 'Slug already exists' } })
    const r = await resource()
    r.startEdit({ id: 2, name: 'два' })
    await r.save()

    expect(m.toast.err).toHaveBeenCalledWith('Slug already exists')
    expect(r.editId.value).toBe(2)
    expect(r.saving.value).toBe(false)
  })
})

describe('удаление', () => {
  test('спрашивает подтверждение и без него не удаляет', async () => {
    m.confirm.mockResolvedValue(false)
    const r = await resource()
    await r.remove({ id: 2, name: 'два' })

    expect(m.api.remove).not.toHaveBeenCalled()
  })

  test('удаляет, закрывает открытую форму той же записи и обновляет список', async () => {
    const r = await resource()
    r.startEdit({ id: 2, name: 'два' })
    await r.remove({ id: 2, name: 'два' }, 'два')

    expect(m.api.remove).toHaveBeenCalledWith('/api/admin/education/2')
    expect(r.editId.value).toBe(null)
    expect(m.refresh).toHaveBeenCalled()
    expect(m.toast.ok).toHaveBeenCalledWith('Education deleted')
  })

  test('форма другой записи остаётся открытой', async () => {
    const r = await resource()
    r.startEdit({ id: 1, name: 'один' })
    await r.remove({ id: 2, name: 'два' })

    expect(r.editId.value).toBe(1)
  })

  test('ошибка удаления — тост, а не молчание', async () => {
    m.api.remove.mockRejectedValue(new Error('Failed to fetch'))
    const r = await resource()
    await r.remove({ id: 2, name: 'два' })

    expect(m.toast.err).toHaveBeenCalledWith('Failed to fetch')
  })
})

describe('порядок', () => {
  test('меняется сразу, а запрос уходит списком id', async () => {
    const r = await resource()
    await r.reorder([2, 1])

    expect(r.items.value.map((i) => i.id)).toEqual([2, 1])
    expect(m.api.patch).toHaveBeenCalledWith('/api/admin/education/reorder', { ids: [2, 1] })
  })

  test('неудачный запрос возвращает прежний порядок', async () => {
    m.api.patch.mockRejectedValue({ statusMessage: 'Unauthorized' })
    const r = await resource()
    await r.reorder([2, 1])

    expect(r.items.value.map((i) => i.id)).toEqual([1, 2])
    expect(m.toast.err).toHaveBeenCalledWith('Unauthorized')
  })

  test('неизвестные id отбрасываются, список не получает пустот', async () => {
    const r = await resource()
    await r.reorder([2, 99])

    expect(r.items.value.map((i) => i.id)).toEqual([2])
  })
})
