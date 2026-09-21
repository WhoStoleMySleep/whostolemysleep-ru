<script setup lang="ts">
const { request, confirm, cancel } = useAdminConfirm()

// Esc закрывает так же, как кнопка: диалог модальный, и без клавиатуры
// из него было бы не выйти.
onMounted(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && request.value) cancel() }
  window.addEventListener('keydown', onKey)
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
})
</script>

<template>
  <Transition name="modal">
    <div v-if="request" class="overlay" @click.self="cancel">
      <div class="dialog" role="alertdialog" aria-modal="true">
        <p class="dialog__title">{{ request.title }}</p>
        <p v-if="request.text" class="dialog__text">{{ request.text }}</p>
        <div class="dialog__actions">
          <button class="admin-btn admin-btn--ghost" type="button" @click="cancel">Cancel</button>
          <button
            class="admin-btn"
            :class="request.danger ? 'admin-btn--danger' : 'admin-btn--primary'"
            type="button"
            autofocus
            @click="confirm"
          >
            {{ request.action }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--overlay-bg);
  backdrop-filter: blur(3px);
}

.dialog {
  width: min(400px, 100%);
  padding: 24px;
  border: 1px solid var(--border-s);
  border-radius: var(--r-s);
  background: var(--bg-1);
}

.dialog__title { font-size: 14px; color: var(--text); margin-bottom: 8px; }
.dialog__text  { font-size: 12px; color: var(--text-4); line-height: 1.6; }

.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.18s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
