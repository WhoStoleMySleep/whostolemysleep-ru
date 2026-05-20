<script setup lang="ts">
useSeoMeta({
  title: 'Контакты',
  description: 'Связаться с фронтенд-разработчиком. Форма обратной связи.',
})

const form = reactive({ name: '', email: '', message: '' })
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMsg = ref('')

async function submit() {
  if (!form.name || !form.email || !form.message) {
    errorMsg.value = 'Заполните все поля'
    return
  }

  status.value = 'loading'
  errorMsg.value = ''

  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    status.value = 'success'
    form.name = ''
    form.email = ''
    form.message = ''
  } catch {
    status.value = 'error'
    errorMsg.value = 'Ошибка отправки. Попробуйте позже.'
  }
}
</script>

<template>
  <div class="page contacts-page">
    <div class="container">
      <header class="page-header">
        <p class="eyebrow">Контакты</p>
        <h1 class="page-title">Давайте<br /><em>поговорим</em></h1>
        <p class="page-subtitle">Открыт к новым проектам, вопросам и интересным предложениям</p>
      </header>

      <div class="contacts-grid">
        <div class="contacts-info">
          <div class="contact-block">
            <p class="contact-block__label">Почта</p>
            <a href="mailto:thekostia5@gmail.com" class="contact-block__value">
              thekostia5@gmail.com
            </a>
          </div>
          <div class="contact-block">
            <p class="contact-block__label">Статус</p>
            <div class="contact-status">
              <span class="contact-status__dot" />
              <span class="contact-status__text">Открыт к предложениям</span>
            </div>
          </div>
          <div class="contact-block">
            <p class="contact-block__label">Время отклика</p>
            <p class="contact-block__value">~24 часа</p>
          </div>
        </div>

        <form class="contact-form" @submit.prevent="submit" novalidate>
          <Transition name="fade" mode="out-in">
            <div v-if="status === 'success'" class="form-success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <p class="form-success__text">Сообщение отправлено. Свяжусь с вами в ближайшее время.</p>
            </div>

            <div v-else class="form-fields">
              <div class="form-group">
                <label class="form-label" for="name">Имя</label>
                <input
                  id="name"
                  v-model="form.name"
                  class="form-input"
                  type="text"
                  placeholder="Иван Иванов"
                  autocomplete="name"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input
                  id="email"
                  v-model="form.email"
                  class="form-input"
                  type="email"
                  placeholder="ivan@example.com"
                  autocomplete="email"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="message">Сообщение</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  class="form-input form-input--textarea"
                  placeholder="Расскажите о вашем проекте..."
                  rows="6"
                />
              </div>

              <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

              <UiButton type="submit" :loading="status === 'loading'">
                Отправить сообщение
              </UiButton>
            </div>
          </Transition>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 64px 0 120px; }
.page-header { margin-bottom: 80px; }
.eyebrow { margin-bottom: 20px; }

.page-title {
  font-family: var(--font-display);
  font-size: clamp(44px, 7vw, 80px);
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1.0;
  margin-bottom: 24px;
}

.page-title em { font-style: italic; color: var(--accent); }

.page-subtitle { font-size: 14px; color: var(--text-2); }

.contacts-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 80px;
  align-items: start;
}

@media (max-width: 768px) { .contacts-grid { grid-template-columns: 1fr; gap: 48px; } }

.contacts-info { display: flex; flex-direction: column; gap: 40px; }

.contact-block__label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 8px;
}

.contact-block__value {
  font-size: 13px;
  color: var(--text-2);
  transition: color 0.2s;
}

a.contact-block__value:hover { color: var(--accent); }

.contact-status { display: flex; align-items: center; gap: 8px; }

.contact-status__dot {
  width: 7px; height: 7px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse-dot 2s ease infinite;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(74, 222, 128, 0); }
}

.contact-status__text { font-size: 13px; color: #4ade80; }

.contact-form { width: 100%; }

.form-fields { display: flex; flex-direction: column; gap: 24px; }

.form-group { display: flex; flex-direction: column; gap: 8px; }

.form-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-3);
}

.form-input {
  background: var(--bg-1);
  border: 1px solid var(--border);
  padding: 14px 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
  resize: none;
  width: 100%;
}

.form-input::placeholder { color: var(--text-3); }
.form-input:focus { border-color: var(--accent); }
.form-input--textarea { resize: vertical; min-height: 140px; }

.form-error {
  font-size: 12px;
  color: var(--red);
  letter-spacing: 0.02em;
}

.form-success {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  background: rgba(74, 222, 128, 0.04);
}

.form-success__text { font-size: 14px; color: var(--text-2); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
