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
  background: #0a0a0f;
  font-family: 'Martian Mono', monospace;
}

.login-form {
  width: 100%;
  max-width: 360px;
  padding: 48px;
  border: 1px solid #1e1e2e;
  background: #0d0d14;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-logo {
  font-size: 22px;
  font-weight: 500;
  color: #e2e2e8;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-logo span:first-of-type { color: #f0c060; }

.login-badge {
  font-size: 9px !important;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f0c060;
  background: rgba(240,192,96,0.1);
  border: 1px solid rgba(240,192,96,0.25);
  padding: 2px 6px;
}

.login-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #666680;
  margin-bottom: 8px;
}

.login-input {
  width: 100%;
  background: #0a0a0f;
  border: 1px solid #1e1e2e;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 13px;
  color: #e2e2e8;
  outline: none;
  transition: border-color 0.15s;
}

.login-input:focus { border-color: #f0c060; }

.login-error {
  font-size: 11px;
  color: #ff6b6b;
  letter-spacing: 0.03em;
}

.login-submit {
  width: 100%;
  background: #f0c060;
  border: none;
  padding: 12px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #0a0a0f;
  cursor: pointer;
  transition: background 0.15s;
}

.login-submit:hover:not(:disabled) { background: #e8b848; }
.login-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
