<script setup lang="ts">
import type { ChangePlan, ContentResource } from '~~/shared/content/types'

defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Тексты и планы' })

const {
  resource, recordId, draft, selectedPlan, dirty, busy, error, conflicted, draftChanged, versionChanged, canApply, loading, loadError,
  records, snapshot, history, plans, preview, reviewPlan, restore, reload, apply, approve,
} = useContentEditor()
const confirm = useAdminConfirm()
const resources: { value: ContentResource, label: string, editor?: string }[] = [
  { value: 'pages', label: 'Тексты страниц' },
  { value: 'post', label: 'Статьи и проекты', editor: '/admin/posts' },
  { value: 'about', label: 'Обо мне', editor: '/admin/about' },
  { value: 'settings', label: 'Настройки', editor: '/admin/settings' },
  { value: 'experience', label: 'Опыт', editor: '/admin/experience' },
  { value: 'education', label: 'Образование', editor: '/admin/education' },
  { value: 'skill', label: 'Навыки', editor: '/admin/skills' },
  { value: 'skill-group', label: 'Группы навыков', editor: '/admin/skills' },
]
const editorLink = computed(() => resources.find(item => item.value === resource.value)?.editor)
const historyEntries = computed(() => (history.value ?? []).map(entry => ({
  ...entry, beforeText: JSON.stringify(entry.before, null, 2), afterText: JSON.stringify(entry.after, null, 2),
})))
const note = computed(() => dirty.value ? 'Есть черновик · ⌘S создаёт только план, не публикует' : 'Сначала diff, затем явное подтверждение')

async function mayDiscard(): Promise<boolean> {
  return !dirty.value || await confirm.ask({ title: 'Перейти к другой записи?', text: 'Несохранённый черновик формы будет сброшен.', action: 'Перейти', danger: false })
}

async function changeResource(event: Event) {
  const select = event.target as HTMLSelectElement
  const next = select.value as ContentResource
  select.value = resource.value
  if (await mayDiscard()) resource.value = next
}

async function changeRecord(event: Event) {
  const select = event.target as HTMLSelectElement
  const next = Number(select.value)
  select.value = String(recordId.value ?? '')
  if (await mayDiscard()) recordId.value = next
}

async function review(plan: ChangePlan) {
  if (await mayDiscard()) reviewPlan(plan)
}
</script>

<template>
  <AdminPage title="Тексты, планы и история" :note="note">
    <template #actions>
      <button type="button" class="admin-btn admin-btn--ghost" :disabled="busy" @click="reload()">Обновить данные</button>
      <NuxtLink to="/admin/content-tokens" class="admin-btn admin-btn--ghost">Токены доступа</NuxtLink>
    </template>

    <div class="content-editor">
      <p class="content-note">Подготовка плана не меняет сайт. Применение меняет данные выбранной серверной среды. Проверьте «До / После» на обоих языках и только затем подтвердите нужный diff. Планы от MCP отображаются в общем списке ниже.</p>
      <div class="admin-panel content-selectors">
        <label>Раздел
          <select :value="resource" :disabled="busy" aria-label="Раздел контента" @change="changeResource">
            <option v-for="item in resources" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>Запись
          <select :value="recordId ?? ''" :disabled="busy || !records?.length" aria-label="Запись контента" @change="changeRecord">
            <option v-if="!records?.length" value="">Нет записей</option>
            <option v-for="item in records" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>
      </div>

      <p v-if="loading" role="status" class="content-note">Загрузка…</p>
      <p v-if="loadError || error" role="alert" class="content-error">{{ error || loadError }}</p>
      <p v-if="conflicted || versionChanged" role="alert" class="content-error">План устарел: обновите данные и создайте новый diff. Старый план не будет применён.</p>
      <p v-if="draftChanged" role="status" class="content-error">Форма изменилась после предпросмотра. Создайте новый план, чтобы применить именно актуальные правки.</p>

      <section v-if="resource === 'pages' && snapshot" aria-label="Редактор текстов страниц">
        <p class="content-note">Только обычный текст, без HTML и инструкций. Системные сообщения, безопасность и политика конфиденциальности здесь не редактируются. RU и EN независимы.</p>
        <AdminPageCopyFields v-model="draft" :disabled="busy || loading" />
        <div class="content-editor__actions">
          <button type="button" class="admin-btn admin-btn--primary" data-action="preview" :disabled="busy || !dirty || loading" @click="preview()">Создать план и посмотреть diff</button>
        </div>
      </section>
      <p v-else-if="editorLink" class="content-note">Существующие записи редактируются в <NuxtLink :to="editorLink">обычном редакторе</NuxtLink>. Здесь можно проверить планы MCP и восстановить версию через новый план. Создания и удаления записей здесь нет.</p>

      <AdminContentPlan v-if="selectedPlan" :plan="selectedPlan" :can-apply="canApply" :busy="busy" @apply="apply()" @approve="approve()" />

      <section class="admin-panel content-list" aria-label="Планы изменений">
        <h2>Все планы, включая MCP</h2>
        <p v-if="!plans?.length" class="content-note">Планов пока нет.</p>
        <article v-for="plan in plans" :key="plan.id" class="content-list__item">
          <div><p>{{ plan.resource }} #{{ plan.recordId }} · {{ plan.status }}</p><p class="content-note">{{ plan.id }} · до {{ plan.expiresAt }}</p></div>
          <button type="button" class="admin-btn admin-btn--ghost" :disabled="busy" :aria-pressed="selectedPlan?.id === plan.id" @click="review(plan)">Проверить diff</button>
        </article>
      </section>

      <section class="admin-panel content-list" aria-label="История изменений">
        <h2>История выбранной записи</h2>
        <p v-if="!history?.length" class="content-note">Применённых изменений пока нет.</p>
        <article v-for="entry in historyEntries" :key="entry.id" class="content-list__item">
          <div class="history-entry">
            <p>{{ entry.createdAt }} · {{ entry.actor }}</p><p class="content-note">{{ entry.id }}</p>
            <details><summary>Посмотреть до / после</summary><p>До</p><pre>{{ entry.beforeText }}</pre><p>После</p><pre>{{ entry.afterText }}</pre></details>
          </div>
          <button type="button" class="admin-btn admin-btn--ghost" :disabled="busy || !snapshot" @click="restore(entry)">Создать план восстановления</button>
        </article>
      </section>
    </div>
  </AdminPage>
</template>

<style scoped>
.content-editor { display: grid; gap: 20px; }
.content-note { color: var(--text-4); font-size: 11px; line-height: 1.7; overflow-wrap: anywhere; }
.content-note a { color: var(--accent); }
.content-error { color: var(--red); line-height: 1.6; }
.content-selectors { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.content-selectors label { display: grid; gap: 8px; color: var(--text-3); }
.content-selectors select { width: 100%; padding: 10px; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: var(--r-s); font: inherit; }
.content-editor__actions { margin-top: 16px; }
.history-entry { min-width: 0; }
.history-entry details { margin-top: 10px; color: var(--text-3); font-size: 11px; }
.history-entry summary { cursor: pointer; }
.history-entry pre { white-space: pre-wrap; overflow-wrap: anywhere; background: var(--bg); padding: 10px; margin-block: 6px; font: inherit; line-height: 1.6; }
.content-list h2 { font-size: 14px; font-weight: 400; margin-bottom: 16px; }
.content-list__item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-block: 12px; border-top: 1px solid var(--border); }
@media (max-width: 680px) { .content-selectors { grid-template-columns: 1fr; } .content-list__item { align-items: flex-start; flex-direction: column; } }
</style>
