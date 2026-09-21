<script setup lang="ts">
const { toasts, dismiss } = useAdminToast()
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <button
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.kind}`"
        type="button"
        @click="dismiss(t.id)"
      >
        {{ t.text }}
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.toast {
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.04em;
  text-align: left;
  padding: 11px 16px;
  border-radius: var(--r-s);
  border: 1px solid var(--border-s);
  background: var(--bg-1);
  color: var(--text-2);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  max-width: 340px;
}

.toast--ok  { border-color: var(--green-border); color: var(--green); }
.toast--err { border-color: var(--red-border);   color: var(--red); }

.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s var(--ease-out); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(12px); }
</style>
