<script setup lang="ts">
const { t } = useLocale()
const localePath = useLocalePath()
const { data: siteSettings } = await useSettings()

useSeoMeta({
  title:       () => t('seo.contacts_title'),
  description: () => t('seo.contacts_desc'),
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VALIDATORS = {
  name:    (v: string) => v.trim().length >= 2,
  email:   (v: string) => EMAIL_RE.test(v.trim()),
  message: (v: string) => v.trim().length >= 10,
}

const savedForm = useState('contact-form', () => ({ name: '', email: '', message: '', consent: false }))
const form    = reactive({ ...savedForm.value, website: '' })
const touched = reactive({ name: false, email: false, message: false, consent: false })
const status  = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const sendError = ref('')

watch(() => ({ name: form.name, email: form.email, message: form.message, consent: form.consent }), (val) => {
  Object.assign(savedForm.value, val)
})

const errors = computed(() => ({
  name:    touched.name    && !VALIDATORS.name(form.name)       ? t('contacts.err_name')    : '',
  email:   touched.email   && !VALIDATORS.email(form.email)     ? t('contacts.err_email')   : '',
  message: touched.message && !VALIDATORS.message(form.message) ? t('contacts.err_message') : '',
  consent: touched.consent && !form.consent                     ? t('contacts.err_consent') : '',
}))

const isValid = computed(() =>
  VALIDATORS.name(form.name) && VALIDATORS.email(form.email) && VALIDATORS.message(form.message) && form.consent
)

function touch(field: keyof typeof touched) { touched[field] = true }

async function submit() {
  touched.name = touched.email = touched.message = touched.consent = true
  if (!isValid.value) return

  status.value  = 'loading'
  sendError.value = ''

  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    status.value = 'success'
    const empty = { name: '', email: '', message: '', consent: false }
    Object.assign(form, empty)
    Object.assign(savedForm.value, empty)
    Object.assign(touched, { name: false, email: false, message: false, consent: false })
  } catch (e: unknown) {
    status.value    = 'error'
    const code = (e as { statusCode?: number })?.statusCode
    sendError.value = code === 429 ? t('contacts.rateLimit') : t('contacts.sendError')
  }
}
</script>

<template>
  <div class="page contacts-page">
    <div class="container">
      <header class="page-header">
        <p class="eyebrow">{{ t('contacts.eyebrow') }}</p>
        <h1 class="page-title">{{ t('contacts.title1') }}<br /><em>{{ t('contacts.title2') }}</em></h1>
        <p class="page-subtitle">{{ t('contacts.subtitle') }}</p>
      </header>

      <div class="contacts-grid">
        <div class="contacts-info">
          <div v-if="siteSettings?.email" class="contact-block">
            <p class="contact-block__label">{{ t('contacts.email') }}</p>
            <a :href="`mailto:${siteSettings.email}`" class="contact-block__value">
              {{ siteSettings.email }}
            </a>
          </div>
          <div v-if="siteSettings?.open_to_work" class="contact-block">
            <p class="contact-block__label">{{ t('contacts.status') }}</p>
            <div class="contact-status">
              <span class="contact-status__dot" />
              <span class="contact-status__text">{{ t('contacts.statusText') }}</span>
            </div>
          </div>
          <div class="contact-block">
            <p class="contact-block__label">{{ t('contacts.response') }}</p>
            <p class="contact-block__value">{{ t('contacts.responseVal') }}</p>
          </div>
        </div>

        <form class="contact-form" @submit.prevent="submit" novalidate>
          <div class="form-honeypot" aria-hidden="true">
            <label for="website">Website</label>
            <input id="website" v-model="form.website" type="text" name="website" autocomplete="off" tabindex="-1" />
          </div>
          <Transition name="fade" mode="out-in">
            <div v-if="status === 'success'" class="form-success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <p class="form-success__text">{{ t('contacts.success') }}</p>
            </div>

            <div v-else class="form-fields">
              <div class="form-group">
                <label class="form-label" for="name">{{ t('contacts.name') }}</label>
                <input
                  id="name"
                  v-model="form.name"
                  :class="['form-input', { 'form-input--error': errors.name }]"
                  type="text"
                  :placeholder="t('contacts.namePlaceholder')"
                  autocomplete="name"
                  @blur="touch('name')"
                />
                <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input
                  id="email"
                  v-model="form.email"
                  :class="['form-input', { 'form-input--error': errors.email }]"
                  type="email"
                  placeholder="ivan@example.com"
                  autocomplete="email"
                  @blur="touch('email')"
                />
                <p v-if="errors.email" class="form-error">{{ errors.email }}</p>
              </div>

              <div class="form-group">
                <label class="form-label" for="message">{{ t('contacts.message') }}</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  :class="['form-input form-input--textarea', { 'form-input--error': errors.message }]"
                  :placeholder="t('contacts.messagePlaceholder')"
                  rows="6"
                  @blur="touch('message')"
                />
                <p v-if="errors.message" class="form-error">{{ errors.message }}</p>
              </div>

              <div class="form-group form-group--consent">
                <label class="form-consent">
                  <input
                    v-model="form.consent"
                    type="checkbox"
                    class="form-consent__checkbox"
                    @change="touch('consent')"
                  />
                  <span class="form-consent__text">
                    {{ t('contacts.consent_before') }}
                    <NuxtLink :to="localePath('/privacy')" class="form-consent__link">{{ t('contacts.consent_link') }}</NuxtLink>
                  </span>
                </label>
                <p v-if="errors.consent" class="form-error">{{ errors.consent }}</p>
              </div>

              <p v-if="sendError" class="form-error">{{ sendError }}</p>

              <UiButton type="submit" :loading="status === 'loading'">
                {{ t('contacts.submit') }}
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
  background: var(--green);
  border-radius: 50%;
  animation: pulse-dot 2s ease infinite;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 var(--green-pulse); }
  50% { box-shadow: 0 0 0 4px transparent; }
}

.contact-status__text { font-size: 13px; color: var(--green); }

.contact-form { width: 100%; position: relative; }

.form-honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

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
.form-input--error { border-color: var(--red); }
.form-input--error:focus { border-color: var(--red); }
.form-input--textarea { resize: vertical; min-height: 140px; }

.form-error {
  font-size: 12px;
  color: var(--red);
  letter-spacing: 0.02em;
}

.form-consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.form-consent__checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border);
  background: var(--bg-1);
  accent-color: var(--accent);
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
}

.form-consent__text {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.5;
}

.form-consent__link {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity 0.2s;
}

.form-consent__link:hover { opacity: 0.75; }

.form-success {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px;
  border: 1px solid var(--green-border);
  background: var(--green-bg);
}

.form-success__text { font-size: 14px; color: var(--text-2); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
