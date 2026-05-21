<script setup lang="ts">
defineProps<{
  tag?: string
  to?: string
  variant?: 'primary' | 'ghost'
  loading?: boolean
}>()
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="btn"
    :class="[`btn--${variant ?? 'primary'}`, { 'btn--loading': loading }]"
    v-bind="$attrs"
  >
    <slot />
    <svg v-if="!loading" class="btn__arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6H10M7 3L10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
  </NuxtLink>
  <button
    v-else
    class="btn"
    :class="[`btn--${variant ?? 'primary'}`, { 'btn--loading': loading }]"
    v-bind="$attrs"
  >
    <slot />
    <svg v-if="!loading" class="btn__arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6H10M7 3L10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.08em;
  padding: 12px 24px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.btn--primary {
  background: var(--accent);
  color: var(--bg);
}

.btn--primary:hover { filter: brightness(1.12); }
.btn--primary:active { transform: scale(0.98); }

.btn--ghost {
  background: transparent;
  color: var(--text-2);
  border: 1px solid var(--border-s);
}

.btn--ghost:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-dim);
}

.btn__arrow {
  transition: transform 0.2s var(--ease-out);
  flex-shrink: 0;
}

.btn:hover .btn__arrow { transform: translateX(3px); }

.btn__spinner {
  width: 12px;
  height: 12px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

.btn--loading { pointer-events: none; opacity: 0.7; }
</style>
