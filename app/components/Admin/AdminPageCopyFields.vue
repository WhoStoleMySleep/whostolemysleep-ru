<script setup lang="ts">
import { PAGE_FIELDS } from '~~/shared/content/registry'
import type { PageCopy } from '~~/shared/content/registry'

defineProps<{ disabled?: boolean }>()
const model = defineModel<PageCopy>({ required: true })
const locales = ['ru', 'en'] as const
const groupLabels: Record<string, string> = {
  hero: 'Главная · первый экран', stack: 'Главная · стек', brings: 'Главная · что приношу проекту', news: 'Главная · выбранные работы',
  blog: 'Блог', projects: 'Проекты', resume: 'Резюме', cv: 'Печатное CV', contacts: 'Контакты', footer: 'Подвал', seo: 'SEO',
}
const groups = computed(() => {
  const result = new Map<string, (typeof PAGE_FIELDS)[number][]>()
  for (const field of PAGE_FIELDS) {
    if (!result.has(field.group)) result.set(field.group, [])
    result.get(field.group)!.push(field)
  }
  return [...result].map(([key, fields]) => ({ key, label: groupLabels[key] ?? key, fields }))
})
const id = useId()
</script>

<template>
  <div class="copy-fields">
    <details v-for="(group, index) in groups" :key="group.key" class="admin-panel copy-group" :open="index === 0">
      <summary>{{ group.label }}</summary>
      <div v-for="field in group.fields" :key="field.key" class="copy-row">
        <p class="copy-row__name">{{ field.label }} <code>{{ field.key }}</code></p>
        <div class="copy-row__languages">
          <label v-for="locale in locales" :key="locale" class="copy-control">
            <span>{{ locale.toUpperCase() }} · {{ (model[locale][field.key] ?? '').length }}/{{ field.maxLength }}</span>
            <textarea
              :id="`${id}-${locale}-${field.key}`"
              v-model="model[locale][field.key]"
              :data-copy-field="`${locale}.${field.key}`"
              :aria-label="`${field.label} ${locale.toUpperCase()}`"
              :maxlength="field.maxLength"
              :rows="field.maxLength > 500 ? 4 : 2"
              :disabled="disabled"
              class="admin-input"
            />
          </label>
        </div>
        <p v-if="field.key === 'hero.lede'" class="copy-hint">Допустим только плейсхолдер <code>{years}</code>. Стаж подставляется автоматически.</p>
      </div>
    </details>
  </div>
</template>

<style scoped>
.copy-fields { display: grid; gap: 12px; }
.copy-group summary { cursor: pointer; color: var(--text-2); font-size: 13px; }
.copy-row { margin-top: 22px; }
.copy-row__name { color: var(--text-3); margin-bottom: 8px; }
.copy-row__name code { color: var(--text-4); font-size: 10px; }
.copy-row__languages { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.copy-control { display: grid; gap: 6px; color: var(--text-4); font-size: 11px; }
.copy-control textarea { width: 100%; padding: 10px; font: inherit; line-height: 1.6; color: var(--text); background: var(--bg); border: 1px solid var(--border); resize: vertical; }
.copy-hint { margin-top: 6px; font-size: 11px; color: var(--text-4); }
@media (max-width: 680px) { .copy-row__languages { grid-template-columns: 1fr; } }
</style>
