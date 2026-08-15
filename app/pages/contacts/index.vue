<script setup lang="ts">
const { t } = useLocale()
const localePath = useLocalePath()
const { data: siteSettings } = await useSettings()
const { public: { contactForm } } = useRuntimeConfig()

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

function resetForm() {
  const empty = { name: '', email: '', message: '', consent: false }
  Object.assign(form, empty)
  Object.assign(savedForm.value, empty)
  Object.assign(touched, { name: false, email: false, message: false, consent: false })
  status.value = 'idle'
  sendError.value = ''
}

async function submit() {
  touched.name = touched.email = touched.message = touched.consent = true
  if (!isValid.value) return

  status.value  = 'loading'
  sendError.value = ''

  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    const empty = { name: '', email: '', message: '', consent: false }
    Object.assign(form, empty)
    Object.assign(savedForm.value, empty)
    Object.assign(touched, { name: false, email: false, message: false, consent: false })
    status.value = 'success'
  } catch (e: unknown) {
    status.value    = 'error'
    const code = (e as { statusCode?: number })?.statusCode
    sendError.value = code === 429 ? t('contacts.rateLimit') : t('contacts.sendError')
  }
}

/**
 * Три способа связи показываются всегда, как в макете. Значения берутся
 * из настроек, если они заданы, иначе — постоянные: раньше блок целиком
 * исчезал, когда настройки не загрузились.
 */
const EMAIL    = 'whostolemysleep@gmail.com'
const TELEGRAM = 'https://t.me/WhoStoleMySleepDev'
const GITHUB   = 'https://github.com/WhoStoleMySleepDev'

const contactLinks = computed(() => {
  const email = siteSettings.value?.email ?? EMAIL
  return [
    { label: 'Email',    value: email,                          href: `mailto:${email}` },
    { label: 'Telegram', value: '@whostolemysleep',             href: siteSettings.value?.telegram_url ?? TELEGRAM },
    { label: 'GitHub',   value: 'github.com/whostolemysleep',   href: siteSettings.value?.github_url ?? GITHUB },
  ]
})
</script>

<template>
  <div class="contacts">
    <UiPageHeader
      large
      :eyebrow="t('contacts.eyebrow')"
      num="04"
      :title="`${t('contacts.title1')} ${t('contacts.title2')}`"
      :subtitle="t('contacts.subtitle')"
    />

    <section class="methods">
      <a
        v-for="link in contactLinks"
        :key="link.label"
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
        class="method"
      >
        <span class="method__label">{{ link.label }}</span>
        <span class="method__value">{{ link.value }}</span>
      </a>
    </section>

    <section v-if="contactForm" class="form-section">
      <div class="form-section__intro">
        <h2 class="form-section__title">{{ t('contacts.form_title') }}</h2>
        <p class="form-section__desc">{{ t('contacts.form_desc') }}</p>
        <span class="form-section__rule" aria-hidden="true" />
      </div>

      <div class="form-section__body">
        <Transition name="fade" mode="out-in">
          <div v-if="status === 'success'" class="sent">
            <p class="sent__title">{{ t('contacts.success') }}</p>
            <button class="sent__again" type="button" @click="resetForm()">
              {{ t('contacts.sendAnother') }}
            </button>
          </div>

          <form v-else class="form" novalidate @submit.prevent="submit">
            <div class="form__honeypot" aria-hidden="true">
              <label for="website">Website</label>
              <input id="website" v-model="form.website" type="text" name="website" autocomplete="off" tabindex="-1">
            </div>

            <label class="field">
              <span class="field__label">{{ t('contacts.name') }}</span>
              <input
                v-model="form.name"
                class="field__input"
                :class="{ 'field__input--error': errors.name }"
                type="text"
                :placeholder="t('contacts.namePlaceholder')"
                autocomplete="name"
                @blur="touch('name')"
              >
              <span v-if="errors.name" class="field__error">{{ errors.name }}</span>
            </label>

            <label class="field">
              <span class="field__label">Email</span>
              <input
                v-model="form.email"
                class="field__input"
                :class="{ 'field__input--error': errors.email }"
                type="email"
                placeholder="ivan@example.com"
                autocomplete="email"
                @blur="touch('email')"
              >
              <span v-if="errors.email" class="field__error">{{ errors.email }}</span>
            </label>

            <label class="field">
              <span class="field__label">{{ t('contacts.message') }}</span>
              <textarea
                v-model="form.message"
                class="field__input field__input--area"
                :class="{ 'field__input--error': errors.message }"
                rows="5"
                :placeholder="t('contacts.messagePlaceholder')"
                @blur="touch('message')"
              />
              <span v-if="errors.message" class="field__error">{{ errors.message }}</span>
            </label>

            <div class="field">
              <label class="consent">
                <input
                  v-model="form.consent"
                  class="consent__box"
                  type="checkbox"
                  @change="touch('consent')"
                >
                <span class="consent__text">
                  {{ t('contacts.consent_before') }}
                  <NuxtLink :to="localePath('/privacy')" class="consent__link">{{ t('contacts.consent_link') }}</NuxtLink>
                  {{ t('contacts.consent_after') }}
                </span>
              </label>
              <span v-if="errors.consent" class="field__error">{{ errors.consent }}</span>
            </div>

            <p v-if="sendError" class="field__error">{{ sendError }}</p>

            <button class="submit" type="submit" :disabled="status === 'loading'">
              {{ t('contacts.submit') }}
            </button>
          </form>
        </Transition>
      </div>
    </section>

    <p v-else class="links-hint">{{ t('contacts.links_hint') }}</p>
  </div>
</template>

<style scoped>
/* ── Способы связи ── */
.methods { display: flex; flex-wrap: wrap; gap: 10px; }

.method {
  flex: 1 1 240px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px;
  border: 1px solid var(--border-s);
  border-radius: var(--r);
  transition: border-color 0.3s, transform 0.3s;
}

.method:hover { border-color: var(--accent); transform: translateY(-3px); }

.method__label {
  font-size: 10.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-4);
}

.method__value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  word-break: break-all;
}

/* ── Форма ── */
.form-section {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(24px, 3vw, 52px);
  padding: clamp(34px, 4vw, 64px) 0 0;
}

.form-section__intro { flex: 1 1 min(100%, 300px); }

.form-section__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(22px, 2.6vw, 32px);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.form-section__desc {
  margin-top: 16px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--text-3);
  text-wrap: pretty;
}

.form-section__rule {
  display: block;
  margin-top: 22px;
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--dash) 0 3px, transparent 3px 8px);
}

.form-section__body { flex: 1 1 min(100%, 340px); min-width: 0; }

/* position: relative нужен ханипоту ниже — он уезжает за левый край
   и без опоры создавал бы горизонтальную прокрутку страницы. */
.form { position: relative; display: flex; flex-direction: column; gap: 14px; }

.form__honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.field { display: flex; flex-direction: column; gap: 8px; }

.field__label {
  font-size: 10.5px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-4);
}

.field__input {
  background: var(--bg-3);
  border: 1px solid var(--border-s);
  border-radius: var(--r-s);
  padding: 13px 15px;
  font-family: var(--font-mono);
  font-size: 13.5px;
  color: var(--text);
  outline: none;
  width: 100%;
  transition: border-color 0.25s;
}

.field__input:focus { border-color: var(--accent); }
.field__input--error { border-color: var(--red); }
.field__input--area { resize: vertical; min-height: 130px; }

.field__error { font-size: 10.5px; color: var(--red); }

.consent { display: flex; align-items: flex-start; gap: 10px; cursor: pointer; }

.consent__box {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 3px;
  accent-color: var(--accent);
  cursor: pointer;
}

.consent__text { font-size: 12px; line-height: 1.55; color: var(--text-4); }

.consent__link {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.submit {
  align-self: start;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: var(--accent-flat);
  color: var(--on-accent);
  border-radius: var(--r-pill);
  padding: 15px 28px;
  transition: transform 0.25s, opacity 0.25s;
}

.submit:hover:not(:disabled) { transform: translateY(-2px); }
.submit:disabled { opacity: 0.6; cursor: default; }

/* ── Успех ── */
.sent {
  border: 1px solid var(--accent-line);
  background: var(--accent-dim);
  border-radius: var(--r);
  padding: 28px;
  animation: rise 0.5s both;
}

.sent__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.02em;
  text-wrap: pretty;
}

.sent__again {
  margin-top: 20px;
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--accent-line);
  border-radius: var(--r-pill);
  padding: 11px 20px;
  transition: background 0.25s;
}

.sent__again:hover { background: var(--accent-dim); }

.links-hint {
  padding-top: 26px;
  font-size: 13.5px;
  color: var(--text-3);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
