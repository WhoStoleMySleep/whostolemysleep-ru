export interface AdminResourceOptions<T, F> {
  /** Base path: '/api/admin/education'. An item is `${endpoint}/${id}`. */
  endpoint: string
  /** The form for a new entry. */
  blank: () => F
  /** Entry to edit form. */
  toForm: (item: T) => F
  /** Form to request body. By default the form is sent as it is. */
  toBody?: (form: F) => unknown
  /** How to name an entry in toasts and in the delete confirmation. */
  title: string
}

/** Marks "the form is open for a new entry" rather than an existing one. */
const NEW = -1

/**
 * The list to form to save to refresh cycle, which used to be copied almost
 * word for word into education, experience, skills and posts — along with editId,
 * saving, errMsg, confirm() and a manual refresh.
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
   * The order is sent as one request with a list of ids. The order field used to
   * be edited by hand in every form, so swapping two entries meant opening both
   * and getting the numbers right.
   */
  async function reorder(ids: number[]) {
    const before = data.value ? [...data.value] : []
    // Optimistic: dragging has to feel instant.
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
