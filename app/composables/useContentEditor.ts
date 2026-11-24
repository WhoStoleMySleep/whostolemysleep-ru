import { PAGE_DEFAULTS, PAGE_FIELDS } from '~~/shared/content/registry'
import type { PageCopy } from '~~/shared/content/registry'
import type { ChangePlan, ContentHistory, ContentRecord, ContentResource, ContentSnapshot } from '~~/shared/content/types'

const CONFLICT_STATUS = 409
const WRITES_DISABLED_STATUS = 503

function responseStatus(error: unknown): number | undefined {
  const response = error as { statusCode?: number, status?: number, response?: { status?: number } }
  return response?.statusCode ?? response?.status ?? response?.response?.status
}

/** Disabled writes and optimistic-lock conflicts must not look like successful saves. */
export function contentError(error: unknown): string {
  if (responseStatus(error) === WRITES_DISABLED_STATUS) return 'Изменения контента отключены на сервере. Ничего не сохранено и не применено.'
  if (responseStatus(error) === CONFLICT_STATUS) return 'Конфликт версий: запись изменилась. Обновите данные и создайте новый план; ваши правки пока остаются в форме.'
  return adminError(error)
}

function copyPages(data?: Record<string, unknown>): PageCopy {
  return {
    ru: { ...PAGE_DEFAULTS.ru, ...(data?.ru as Record<string, string> | undefined) },
    en: { ...PAGE_DEFAULTS.en, ...(data?.en as Record<string, string> | undefined) },
  }
}

function changedLocale(draft: Record<string, string>, original: Record<string, string>): Record<string, string> {
  return Object.fromEntries(PAGE_FIELDS.filter(field => draft[field.key] !== original[field.key])
    .map(field => [field.key, draft[field.key] ?? '']))
}

function pagesPatch(draft: PageCopy, original: PageCopy): Partial<PageCopy> {
  const ru = changedLocale(draft.ru, original.ru)
  const en = changedLocale(draft.en, original.en)
  return { ...(Object.keys(ru).length ? { ru } : {}), ...(Object.keys(en).length ? { en } : {}) }
}

function planSignature(plan: ChangePlan): string {
  return JSON.stringify([plan.id, plan.resource, plan.recordId, plan.version, plan.before, plan.after, plan.diff])
}

function planExpired(plan: ChangePlan): boolean {
  return !Number.isFinite(Date.parse(plan.expiresAt)) || Date.parse(plan.expiresAt) <= Date.now()
}

/** Snapshot edits only create plans. Approval and application require separate, explicit user actions. */
export function useContentEditor() {
  const api = useAdminApi()
  const toast = useAdminToast()
  const confirm = useAdminConfirm()
  const resource = ref<ContentResource>('pages')
  const recordId = ref<number | null>(1)
  const draft = ref<PageCopy>(copyPages())
  const selectedPlan = ref<ChangePlan | null>(null)
  const previewPatch = ref<string | null>(null)
  const busy = ref(false)
  const error = ref('')
  const conflicted = ref(false)
  const query = computed(() => `resource=${encodeURIComponent(resource.value)}&recordId=${recordId.value ?? ''}`)

  const records = useAsyncData(() => `admin:content:records:${resource.value}`,
    () => api.get<ContentRecord[]>(`/api/admin/content/records?resource=${encodeURIComponent(resource.value)}`))
  const snapshot = useAsyncData(() => `admin:content:snapshot:${query.value}`,
    () => recordId.value === null ? Promise.resolve(null) : api.get<ContentSnapshot>(`/api/admin/content/snapshot?${query.value}`))
  const history = useAsyncData(() => `admin:content:history:${query.value}`,
    () => recordId.value === null ? Promise.resolve([]) : api.get<ContentHistory[]>(`/api/admin/content/history?${query.value}`))
  const plans = useAsyncData('admin:content:plans', () => api.get<ChangePlan[]>('/api/admin/content/plans'))

  const original = computed(() => copyPages(snapshot.data.value?.data))
  const patch = computed(() => pagesPatch(draft.value, original.value))
  const dirty = computed(() => resource.value === 'pages' && Object.keys(patch.value).length > 0)
  const draftChanged = computed(() => previewPatch.value === null
    ? !!selectedPlan.value && dirty.value
    : previewPatch.value !== JSON.stringify(patch.value))
  const versionChanged = computed(() => selectedPlan.value && selectedPlan.value.status !== 'applied' && snapshot.data.value
    && selectedPlan.value.version !== snapshot.data.value.version)
  const canApply = computed(() => !!selectedPlan.value && !busy.value && !conflicted.value && !versionChanged.value
    && !draftChanged.value && !planExpired(selectedPlan.value) && selectedPlan.value.status !== 'applied'
    && snapshot.data.value?.resource === selectedPlan.value.resource && snapshot.data.value?.recordId === selectedPlan.value.recordId)
  const loading = computed(() => records.pending.value || snapshot.pending.value || history.pending.value || plans.pending.value)
  const loadError = computed(() => [records.error.value, snapshot.error.value, history.error.value, plans.error.value]
    .filter(Boolean).map(contentError).join(' · '))

  watch(resource, () => { recordId.value = resource.value === 'pages' ? 1 : null }, { flush: 'sync' })
  watch(records.data, list => { if (recordId.value === null) recordId.value = list?.[0]?.id ?? null })
  watch(snapshot.data, value => { if (value?.resource === 'pages') draft.value = copyPages(value.data) }, { immediate: true })
  watch([resource, recordId], () => { selectedPlan.value = null; previewPatch.value = null; conflicted.value = false }, { flush: 'sync' })

  function fail(cause: unknown) {
    error.value = contentError(cause)
    conflicted.value = responseStatus(cause) === CONFLICT_STATUS
    toast.err(error.value)
  }

  function reviewPlan(plan: ChangePlan) {
    if (busy.value) return
    resource.value = plan.resource
    recordId.value = plan.recordId
    selectedPlan.value = JSON.parse(JSON.stringify(plan)) as ChangePlan
    if (plan.resource === 'pages') draft.value = copyPages(snapshot.data.value?.data)
    previewPatch.value = null
    conflicted.value = false
    error.value = ''
  }

  async function preview() {
    const current = snapshot.data.value
    if (busy.value || !dirty.value || !current || resource.value !== 'pages'
      || current.resource !== resource.value || current.recordId !== recordId.value) return
    const submittedPatch = JSON.stringify(patch.value)
    busy.value = true
    error.value = ''
    try {
      const plan = await api.post<ChangePlan>('/api/admin/content/plan', {
        resource: current.resource, recordId: current.recordId, expectedVersion: current.version, patch: JSON.parse(submittedPatch),
      })
      reviewCreatedPlan(plan, submittedPatch)
      await plans.refresh()
    } catch (cause) { fail(cause) }
    finally { busy.value = false }
  }

  function reviewCreatedPlan(plan: ChangePlan, submittedPatch: string | null) {
    selectedPlan.value = plan
    previewPatch.value = submittedPatch
    conflicted.value = false
  }

  async function restore(entry: ContentHistory) {
    const current = snapshot.data.value
    if (busy.value || !current || current.resource !== entry.resource || current.recordId !== entry.recordId) return
    busy.value = true
    error.value = ''
    try {
      if (dirty.value && !await confirm.ask({ title: 'Заменить черновик планом восстановления?', action: 'Продолжить', danger: false })) return
      const plan = await api.post<ChangePlan>('/api/admin/content/restore-plan', { historyId: entry.id, expectedVersion: current.version })
      if (current.resource === 'pages') draft.value = copyPages(current.data)
      reviewCreatedPlan(plan, null)
      await plans.refresh()
    } catch (cause) { fail(cause) }
    finally { busy.value = false }
  }

  async function approveReviewed(plan: ChangePlan): Promise<ChangePlan | null> {
    if (plan.status === 'approved') return plan
    const approved = await api.post<ChangePlan>('/api/admin/content/approve', { planId: plan.id })
    if (approved.status !== 'approved' || planExpired(approved) || planSignature(approved) !== planSignature(plan)) {
      error.value = 'План изменился или истёк. Откройте его заново и проверьте diff перед подтверждением.'
      return null
    }
    selectedPlan.value = approved
    return approved
  }

  async function confirmPlan(applyNow: boolean) {
    const plan = selectedPlan.value
    if (!plan || !canApply.value || planExpired(plan)) return
    busy.value = true
    error.value = ''
    try {
      const accepted = await confirm.ask({
        title: applyNow ? 'Подтвердить и применить этот diff?' : 'Одобрить этот diff для MCP?',
        text: applyNow ? 'Будут опубликованы только показанные изменения. Черновик формы будет сброшен.'
          : 'Владелец токена с правом apply сможет применить именно этот diff до истечения срока плана. Одобрение само по себе не меняет сайт.',
        action: applyNow ? 'Применить' : 'Одобрить для MCP', danger: false,
      })
      if (accepted && isStillReviewed(plan)) await finishPlan(plan, applyNow)
    } catch (cause) { fail(cause) }
    finally { busy.value = false }
  }

  function isStillReviewed(plan: ChangePlan): boolean {
    return !!selectedPlan.value && !planExpired(plan) && !draftChanged.value && !versionChanged.value
      && planSignature(plan) === planSignature(selectedPlan.value)
  }

  async function finishPlan(plan: ChangePlan, applyNow: boolean) {
    const approved = await approveReviewed(plan)
    if (!approved) return
    if (applyNow) {
      await api.post('/api/admin/content/apply', { planId: approved.id })
      selectedPlan.value = { ...approved, status: 'applied' }
      previewPatch.value = null
      await Promise.all([snapshot.refresh(), history.refresh()])
      toast.ok('План применён')
    } else toast.ok('План одобрен. Публичные данные ещё не изменены.')
    await plans.refresh()
  }

  async function reload() {
    if (busy.value) return
    if (dirty.value && !await confirm.ask({ title: 'Обновить данные и сбросить черновик?', action: 'Обновить', danger: false })) return
    selectedPlan.value = null
    previewPatch.value = null
    conflicted.value = false
    error.value = ''
    await Promise.all([records.refresh(), snapshot.refresh(), history.refresh(), plans.refresh()])
  }

  useUnsavedGuard({ dirty, save: preview })

  return {
    resource, recordId, draft, selectedPlan, dirty, busy, error, conflicted, draftChanged, versionChanged, canApply, loading, loadError,
    records: records.data, snapshot: snapshot.data, history: history.data, plans: plans.data,
    preview, reviewPlan, restore, reload, apply: () => confirmPlan(true), approve: () => confirmPlan(false),
  }
}
