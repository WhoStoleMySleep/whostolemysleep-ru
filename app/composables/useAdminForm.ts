export interface AdminFormOptions<T, F extends object> {
  endpoint: string
  /** Ответ API → поля формы. */
  toForm: (data: T) => F
  /** Форма → тело PATCH. По умолчанию уходит форма как есть. */
  toBody?: (form: F) => unknown
  title: string
}

/**
 * Одна форма на страницу (About, Settings) — без списка и режима создания.
 *
 * Сверх прежнего кода страниц даёт две вещи: отметку о несохранённых
 * правках и защиту от ухода со страницы с ними. Раньше текст about можно
 * было потерять, случайно нажав на пункт меню.
 */
export function useAdminForm<T, F extends object>(opts: AdminFormOptions<T, F>) {
  const api   = useAdminApi()
  const toast = useAdminToast()

  const { data, refresh } = useAsyncData<T>(opts.endpoint, () => api.get<T>(opts.endpoint))

  const form   = ref<F>({} as F) as Ref<F>
  const saving = ref(false)
  /** Слепок сохранённого состояния — с ним сравнивается форма. */
  const saved  = ref('')

  function reset(value: T | null) {
    if (!value) return
    form.value = opts.toForm(value)
    saved.value = JSON.stringify(form.value)
  }

  // useAsyncData оборачивает T в PickFrom<>, поэтому приводим явно.
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

    // Ctrl/Cmd+S — привычка из любого редактора; браузерный «сохранить
    // страницу» здесь бесполезен, поэтому перехватываем.
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
