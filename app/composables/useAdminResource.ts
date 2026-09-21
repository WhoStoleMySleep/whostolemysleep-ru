export interface AdminResourceOptions<T, F> {
  /** Базовый путь: '/api/admin/education'. Элемент — `${endpoint}/${id}`. */
  endpoint: string
  /** Форма для новой записи. */
  blank: () => F
  /** Запись → форма редактирования. */
  toForm: (item: T) => F
  /** Форма → тело запроса. По умолчанию отправляется форма как есть. */
  toBody?: (form: F) => unknown
  /** Как называть запись в тостах и подтверждении удаления. */
  title: string
}

/** Признак «форма открыта для новой записи», а не для существующей. */
const NEW = -1

/**
 * Цикл «список → форма → сохранение → обновление», который до этого был
 * скопирован в education, experience, skills и posts почти дословно —
 * вместе с editId, saving, errMsg, confirm() и ручным refresh.
 */
export function useAdminResource<T extends { id: number }, F extends object>(
  opts: AdminResourceOptions<T, F>,
) {
  const api     = useAdminApi()
  const toast   = useAdminToast()
  const confirm = useAdminConfirm()

  const { data, status, refresh } = useAsyncData<T[]>(
    opts.endpoint,
    () => api.get<T[]>(opts.endpoint),
    { default: () => [] },
  )

  const items   = computed(() => data.value ?? [])
  const loading = computed(() => status.value === 'pending')

  const editId = ref<number | null>(null)
  const form   = ref<F>(opts.blank()) as Ref<F>
  const saving = ref(false)

  const isNew   = computed(() => editId.value === NEW)
  const editing = computed(() => editId.value !== null)

  function startNew() {
    editId.value = NEW
    form.value   = opts.blank()
  }

  function startEdit(item: T) {
    editId.value = item.id
    form.value   = opts.toForm(item)
  }

  function cancel() {
    editId.value = null
  }

  async function save() {
    saving.value = true
    try {
      const body = opts.toBody ? opts.toBody(form.value) : form.value
      if (isNew.value) await api.post(opts.endpoint, body)
      else             await api.patch(`${opts.endpoint}/${editId.value}`, body)

      await refresh()
      editId.value = null
      toast.ok(`${opts.title} saved`)
    } catch (e) {
      toast.err(adminError(e))
    } finally {
      saving.value = false
    }
  }

  async function remove(item: T, label?: string) {
    const ok = await confirm.ask({
      title: `Delete ${opts.title.toLowerCase()}?`,
      text:  label ? `«${label}» will be removed permanently.` : 'This cannot be undone.',
    })
    if (!ok) return

    try {
      await api.remove(`${opts.endpoint}/${item.id}`)
      if (editId.value === item.id) editId.value = null
      await refresh()
      toast.ok(`${opts.title} deleted`)
    } catch (e) {
      toast.err(adminError(e))
    }
  }

  /**
   * Порядок уходит одним запросом списком id. Раньше поле order правили
   * руками в каждой форме, и чтобы поменять две записи местами, нужно было
   * открыть обе и не ошибиться в числах.
   */
  async function reorder(ids: number[]) {
    const before = data.value ? [...data.value] : []
    // Оптимистично: перетаскивание должно ощущаться мгновенно.
    const byId = new Map(before.map((item) => [item.id, item]))
    data.value = ids.map((id) => byId.get(id)).filter(Boolean) as T[]

    try {
      await api.patch(`${opts.endpoint}/reorder`, { ids })
    } catch (e) {
      data.value = before
      toast.err(adminError(e))
    }
  }

  return {
    items, loading, refresh,
    editId, form, isNew, editing, saving,
    startNew, startEdit, cancel, save, remove, reorder,
  }
}
