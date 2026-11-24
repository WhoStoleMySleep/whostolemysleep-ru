<script setup lang="ts">
import type { ContentResource, ContentScope, ContentTokenInfo } from '~~/shared/content/types'

defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Токены контента' })

const api = useAdminApi()
const toast = useAdminToast()
const confirm = useAdminConfirm()
const MAX_TOKEN_DAYS = 90
const DEFAULT_TOKEN_DAYS = 30
const TOKEN_LABEL_LIMIT = 100
const resources: { value: ContentResource, label: string }[] = [
  { value: 'pages', label: 'Тексты страниц' }, { value: 'post', label: 'Статьи и проекты' }, { value: 'about', label: 'Обо мне' },
  { value: 'settings', label: 'Настройки' }, { value: 'experience', label: 'Опыт' }, { value: 'education', label: 'Образование' },
  { value: 'skill', label: 'Навыки' }, { value: 'skill-group', label: 'Группы навыков' },
]
const scopeOptions: { value: ContentScope, label: string }[] = [
  { value: 'read', label: 'read · читать snapshot' }, { value: 'plan', label: 'plan · создавать diff-планы' }, { value: 'apply', label: 'apply · применять только approved' },
  { value: 'create-project', label: 'create-project · создавать проекты только как черновики' },
]
const form = reactive({ label: '', resources: ['pages'] as ContentResource[], scopes: ['read', 'plan'] as ContentScope[], expiresInDays: DEFAULT_TOKEN_DAYS })
const reveal = ref<{ token: string, id: string } | null>(null)
const copied = ref(false)
const busy = ref(false)
const saveError = ref('')
const { data: tokens, refresh, error: loadError, pending } = await useAsyncData('admin:content:tokens', () => api.get<ContentTokenInfo[]>('/api/admin/content/tokens'))

const activeTokens = computed(() => tokens.value ?? [])
const canCreate = computed(() => !busy.value && !reveal.value && form.label.trim().length > 0 && form.label.length <= TOKEN_LABEL_LIMIT
  && form.resources.length > 0 && form.scopes.length > 0 && Number.isInteger(form.expiresInDays)
  && form.expiresInDays >= 1 && form.expiresInDays <= MAX_TOKEN_DAYS)

function toggle<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

function toggleResource(value: ContentResource) { form.resources = toggle(form.resources, value) }
function toggleScope(value: ContentScope) { form.scopes = toggle(form.scopes, value) }
async function createToken() {
  if (!canCreate.value) return
  saveError.value = ''
  busy.value = true
  try {
    reveal.value = await api.post<{ token: string, id: string }>('/api/admin/content/tokens', {
      label: form.label.trim(), resources: [...form.resources], scopes: [...form.scopes], expiresInDays: form.expiresInDays,
    })
    copied.value = false
    form.label = ''
    await refresh()
  } catch (cause) { saveError.value = contentError(cause); toast.err(saveError.value) }
  finally { busy.value = false }
}

function hideToken() { reveal.value = null; copied.value = false }

async function copyToken() {
  if (!reveal.value || !import.meta.client) return
  try { await navigator.clipboard.writeText(reveal.value.token); copied.value = true }
  catch { toast.err('Не удалось скопировать. Выделите секрет и скопируйте вручную.') }
}

async function revokeToken(token: ContentTokenInfo) {
  if (busy.value) return
  busy.value = true
  try {
    const accepted = await confirm.ask({ title: `Отозвать токен «${token.label}»?`, text: 'После отзыва MCP больше не сможет читать данные или создавать планы.', action: 'Отозвать', danger: true })
    if (!accepted) return
    await api.post('/api/admin/content/tokens/revoke', { id: token.id })
    if (reveal.value?.id === token.id) hideToken()
    await refresh()
    toast.ok('Токен отозван')
  } catch (cause) { toast.err(contentError(cause)) }
  finally { busy.value = false }
}

onBeforeUnmount(hideToken)
</script>

<template>
  <AdminPage title="Токены доступа" note="Секрет показывается один раз и не сохраняется в браузере">
    <div class="token-page">
      <p class="token-note">Токен не даёт прямого доступа к production DB. По умолчанию доступны read и plan; apply и create-project можно выдать только осознанно, а сервер всё равно требует одобрения владельца. Право create-project используется с ресурсом «Статьи и проекты» и позволяет подготовить создание проекта только как черновика, без публикации. Не вставляйте секрет в URL, логи или конфигурацию.</p>
      <p v-if="pending" class="token-note" role="status">Загрузка токенов…</p>
      <p v-if="loadError" class="token-error" role="alert">{{ contentError(loadError) }}</p>
      <section class="admin-panel token-form">
        <h2>Выпустить токен</h2>
        <AdminField v-model="form.label" label="Название" placeholder="MCP для текстов" />
        <fieldset>
          <legend>Ресурсы</legend>
          <label v-for="item in resources" :key="item.value"><input type="checkbox" :checked="form.resources.includes(item.value)" @change="toggleResource(item.value)"> {{ item.label }}</label>
        </fieldset>
        <fieldset>
          <legend>Права</legend>
          <label v-for="item in scopeOptions" :key="item.value"><input type="checkbox" :data-scope="item.value" :checked="form.scopes.includes(item.value)" @change="toggleScope(item.value)"> {{ item.label }}</label>
        </fieldset>
        <AdminField v-model="form.expiresInDays" label="Срок (дни, 1–90)" type="number" :min="1" :max="90" />
        <p v-if="saveError" role="alert" class="token-error">{{ saveError }}</p>
        <button type="button" class="admin-btn admin-btn--primary" :disabled="!canCreate" @click="createToken">Выпустить токен</button>
      </section>

      <section v-if="reveal" class="admin-panel token-reveal" role="alert">
        <h2>Скопируйте секрет сейчас</h2>
        <p>Он больше не будет показан. Не сохраняем его в localStorage и не отправляем в URL.</p>
        <code>{{ reveal.token }}</code>
        <button type="button" class="admin-btn admin-btn--primary" @click="copyToken">{{ copied ? 'Скопировано' : 'Скопировать' }}</button>
        <button type="button" class="admin-btn admin-btn--ghost" data-action="hide-token" @click="hideToken">Сохранил, скрыть секрет</button>
      </section>

      <section class="admin-panel token-list">
        <h2>Выданные токены</h2>
        <p v-if="!activeTokens.length" class="token-note">Токенов пока нет.</p>
        <article v-for="token in activeTokens" :key="token.id" class="token-row">
          <div><strong>{{ token.label }}</strong><p>{{ token.resources.join(', ') }} · {{ token.scopes.join(', ') }}</p><p>до {{ token.expiresAt }}<template v-if="token.revokedAt"> · отозван {{ token.revokedAt }}</template></p></div>
          <button v-if="!token.revokedAt" type="button" class="admin-btn admin-btn--danger" :disabled="busy" @click="revokeToken(token)">Отозвать</button>
        </article>
      </section>
    </div>
  </AdminPage>
</template>

<style scoped>
.token-page { display: grid; gap: 20px; }
.token-note { color: var(--text-4); font-size: 11px; line-height: 1.7; }
.token-form, .token-reveal, .token-list { display: grid; gap: 16px; }
.token-form h2, .token-reveal h2, .token-list h2 { font-size: 14px; font-weight: 400; }
.token-form fieldset { display: grid; gap: 9px; border: 0; color: var(--text-3); }
.token-form legend { margin-bottom: 4px; color: var(--text-4); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }
.token-form label { font-size: 12px; }
.token-form input[type='checkbox'] { accent-color: var(--accent); }
.token-reveal { border-color: var(--accent-line); }
.token-reveal code { display: block; padding: 12px; color: var(--text); background: var(--bg); border: 1px solid var(--border); overflow-wrap: anywhere; user-select: all; }
.token-reveal p, .token-row p { color: var(--text-4); font-size: 11px; line-height: 1.6; }
.token-error { color: var(--red); font-size: 12px; }
.token-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-block: 14px; border-top: 1px solid var(--border); }
.token-row strong { font-weight: 400; color: var(--text-2); }
@media (max-width: 680px) { .token-row { align-items: flex-start; flex-direction: column; } }
</style>
