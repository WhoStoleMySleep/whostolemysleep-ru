export interface AdminFormOptions<T, F extends object> {
  endpoint: string
  /** API response to form fields. */
  toForm: (data: T) => F
  /** Form to PATCH body. By default the form is sent as it is. */
  toBody?: (form: F) => unknown
  title: string
}

/**
 * One form per page (About, Settings) — no list, no create mode.
 *
 * Over what the pages did before, it adds two things: a dirty marker and a guard
 * against leaving the page with unsaved edits. The about text used to be lost by
 * accidentally clicking a menu item.
 */
export function useAdminForm<T, F extends object>(opts: AdminFormOptions<T, F>) {
  const api   = useAdminApi()
  const toast = useAdminToast()

  const { data, refresh } = useAsyncData<T>(opts.endpoint, () => api.get<T>(opts.endpoint))

  const form   = ref<F>({} as F) as Ref<F>
  const saving = ref(false)
  /** Snapshot of the saved state — the form is compared against it. */
  const saved  = ref('')

  function reset(value: T | null) {
    if (!value) return
    form.value = opts.toForm(value)
    saved.value = JSON.stringify(form.value)
  }

  // useAsyncData wraps T in PickFrom<>, hence the explicit cast.
  reset((data.value ?? null) as T | null)
  watch(data, (v) => reset((v ?? null) as T | null))

  const dirty = computed(() => saved.value !== '' && JSON.stringify(form.value) !== saved.value)

  async function save() {
    saving.value = true
    try {
      await api.patch(opts.endpoint, opts.toBody ? opts.toBody(form.value) : form.value)
      saved.value = JSON.stringify(form.value)
      await refresh()
      toast.ok(`${opts.title} saved — added to cache queue`)
    } catch (e) {
      toast.err(adminError(e))
    } finally {
      saving.value = false
    }
  }

  if (import.meta.client) {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.value) e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    onBeforeUnmount(() => window.removeEventListener('beforeunload', warn))

    // Ctrl/Cmd+S is muscle memory from every editor; the browser's "save page"
    // is useless here, so the shortcut is intercepted.
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty.value) save() }
    }
    window.addEventListener('keydown', onKey)
    onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
  }

  onBeforeRouteLeave(() => {
    if (!dirty.value) return true
    return useAdminConfirm().ask({
      title:  'Leave with unsaved changes?',
      text:   'Edits on this page will be lost.',
      action: 'Leave',
    })
  })

  return { form, dirty, saving, save, refresh }
}
