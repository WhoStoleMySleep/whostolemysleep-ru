<script setup lang="ts">
defineProps<{
  title: string
  /** Строка под заголовком: сколько записей, когда сохраняли. */
  note?: string
}>()
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1 class="page-head__title">{{ title }}</h1>
        <p v-if="note" class="page-head__note">{{ note }}</p>
      </div>
      <div class="page-head__actions">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.page-head__title {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--text);
}

.page-head__note {
  margin-top: 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-4);
}

.page-head__actions { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
