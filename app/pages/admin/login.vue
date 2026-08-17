<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: false })

useHead({ title: 'Admin login' })

const router   = useRouter()
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function submit() {
  if (!password.value) return
  loading.value = true
  error.value   = ''

  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    router.push('/admin')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="submit" novalidate>
      <div class="login-logo">
        wms<span>.</span>
        <span class="login-badge">admin</span>
      </div>

      <div class="login-field">
        <label class="login-label" for="pw">Password</label>
        <input
          id="pw"
          v-model="password"
          type="password"
          class="login-input"
          autocomplete="current-password"
          autofocus
        />
      </div>

      <p v-if="error" class="login-error">{{ error }}</p>

      <button class="login-submit" type="submit" :disabled="loading">
        {{ loading ? 'Checking...' : 'Enter' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  font-family: var(--font-mono);
}

.login-form {
  width: 100%;
  max-width: 360px;
  padding: 48px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--bg-1);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-logo {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-logo span:first-of-type { color: var(--accent); }

.login-badge {
  font-size: 9px !important;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-line);
  border-radius: var(--r-pill);
  padding: 3px 9px;
}

.login-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-4);
  margin-bottom: 8px;
}

.login-input {
  width: 100%;
  background: var(--bg-3);
  border: 1px solid var(--border-s);
  border-radius: var(--r-s);
  padding: 12px 14px;
  font-family: inherit;
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}

.login-input:focus { border-color: var(--accent); }

.login-error {
  font-size: 11px;
  color: var(--red);
  letter-spacing: 0.03em;
}

.login-submit {
  width: 100%;
  background: var(--accent-btn);
  border: none;
  border-radius: var(--r-pill);
  padding: 14px;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--on-accent);
  cursor: pointer;
  transition: filter 0.15s;
}

.login-submit:hover:not(:disabled) { filter: brightness(1.08); }
.login-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
