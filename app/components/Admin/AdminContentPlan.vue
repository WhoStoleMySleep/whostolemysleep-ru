<script setup lang="ts">
import type { ChangePlan } from '~~/shared/content/types'

defineProps<{ plan: ChangePlan, canApply: boolean, busy: boolean }>()
defineEmits<{ apply: [], approve: [] }>()

function show(value: unknown): string {
  if (value === undefined) return '—'
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}
</script>

<template>
  <section class="admin-panel plan-preview" aria-label="Предпросмотр изменений">
    <h2>Предпросмотр плана</h2>
    <p class="plan-preview__meta">{{ plan.resource }} #{{ plan.recordId }} · {{ plan.status }} · {{ plan.id }}</p>
    <p class="plan-preview__meta">Действует до {{ plan.expiresAt }}</p>
    <div v-for="change in plan.diff" :key="change.field" class="diff-row" :data-diff-field="change.field">
      <h3>{{ change.field }}</h3>
      <div class="diff-row__values">
        <div><span>До</span><pre>{{ show(change.before) }}</pre></div>
        <div><span>После</span><pre>{{ show(change.after) }}</pre></div>
      </div>
    </div>
    <p v-if="!plan.diff.length" class="plan-preview__meta">Изменений нет.</p>
    <p class="plan-preview__note">План не меняет сайт до применения. Одобрение для MCP разрешает владельцу токена с правом apply применить именно этот diff до истечения срока.</p>
    <div class="plan-preview__actions">
      <button
        v-if="plan.status === 'pending'"
        type="button"
        class="admin-btn admin-btn--ghost"
        data-action="approve"
        :disabled="!canApply || busy"
        @click="$emit('approve')"
      >Одобрить для MCP</button>
      <button
        type="button"
        class="admin-btn admin-btn--primary"
        data-action="apply"
        :disabled="!canApply || busy || !plan.diff.length"
        @click="$emit('apply')"
      >{{ plan.status === 'applied' ? 'Применён' : plan.status === 'approved' ? 'Применить' : 'Подтвердить и применить' }}</button>
    </div>
  </section>
</template>

<style scoped>
.plan-preview { display: grid; gap: 14px; }
.plan-preview h2 { font-size: 15px; font-weight: 400; }
.plan-preview__meta, .plan-preview__note { color: var(--text-4); font-size: 11px; overflow-wrap: anywhere; line-height: 1.6; }
.plan-preview__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.diff-row { border-top: 1px solid var(--border); padding-top: 12px; min-width: 0; }
.diff-row h3 { color: var(--text-3); font-size: 12px; font-weight: 400; margin-bottom: 10px; }
.diff-row__values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.diff-row__values span { font-size: 10px; color: var(--text-4); }
.diff-row pre { margin-top: 6px; padding: 10px; background: var(--bg); color: var(--text-2); border: 1px solid var(--border); border-radius: var(--r-s); white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.6; }
@media (max-width: 680px) { .diff-row__values { grid-template-columns: 1fr; } }
</style>
