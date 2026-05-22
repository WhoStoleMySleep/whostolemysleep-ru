<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Settings' })

interface Settings {
  id: number
  open_to_work: boolean
  show_search: boolean
  github_url: string
  telegram_url: string
  email: string
}

const { data: raw, refresh } = await useFetch<Settings>('/api/admin/settings')

const form = reactive({
  open_to_work: raw.value?.open_to_work ?? true,
  show_search:  raw.value?.show_search  ?? true,
  github_url:   raw.value?.github_url   ?? '',
  telegram_url: raw.value?.telegram_url ?? '',
  email:        raw.value?.email        ?? '',
})

watch(raw, (val) => {
  if (!val) return
  form.open_to_work = val.open_to_work
  form.show_search  = val.show_search
  form.github_url   = val.github_url
  form.telegram_url = val.telegram_url
  form.email        = val.email
})

const saving = ref(false)
const saved  = ref(false)

async function save() {
  saving.value = true
  saved.value  = false
  try {
    await $fetch('/api/admin/settings', { method: 'PATCH', body: form })
    await refresh()
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="dash-title">Settings</div>

    <div class="settings-section">
      <p class="section-title">Status</p>
      <div class="toggle-row">
        <label class="toggle-label">
          <span class="toggle-label__text">Open to opportunities</span>
          <span class="toggle-label__desc">Displays green badge on hero and contacts pages</span>
        </label>
        <button
          class="toggle-btn"
          :class="{ 'toggle-btn--on': form.open_to_work }"
          @click="form.open_to_work = !form.open_to_work"
        >
          <span class="toggle-thumb" />
        </button>
      </div>
      <div class="toggle-row">
        <label class="toggle-label">
          <span class="toggle-label__text">Show search</span>
          <span class="toggle-label__desc">Displays search button in the header</span>
        </label>
        <button
          class="toggle-btn"
          :class="{ 'toggle-btn--on': form.show_search }"
          @click="form.show_search = !form.show_search"
        >
          <span class="toggle-thumb" />
        </button>
      </div>
    </div>

    <div class="settings-section">
      <p class="section-title">Social Links</p>
      <div class="field-row">
        <label class="field-label">GitHub URL</label>
        <input v-model="form.github_url" class="admin-input" type="url" placeholder="https://github.com/..." />
      </div>
      <div class="field-row">
        <label class="field-label">Telegram URL</label>
        <input v-model="form.telegram_url" class="admin-input" type="url" placeholder="https://t.me/..." />
      </div>
      <div class="field-row">
        <label class="field-label">Email</label>
        <input v-model="form.email" class="admin-input" type="email" placeholder="you@example.com" />
      </div>
    </div>

    <div class="save-row">
      <span v-if="saved" class="save-msg">Saved</span>
      <button class="admin-btn admin-btn--primary" :disabled="saving" @click="save">
        {{ saving ? 'Saving...' : 'Save Settings' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.dash-title {
  font-size: 22px;
  font-weight: 300;
  letter-spacing: -0.02em;
  color: #e2e2e8;
  margin-bottom: 32px;
}

.section-title {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #666680;
  margin-bottom: 16px;
}

.settings-section {
  border: 1px solid #1e1e2e;
  background: #0d0d14;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #14141e;
  gap: 24px;
}

.toggle-row:last-child { border-bottom: none; }

.toggle-label { display: flex; flex-direction: column; gap: 4px; }
.toggle-label__text { font-size: 13px; color: #a0a0b8; }
.toggle-label__desc { font-size: 11px; color: #444460; }

.toggle-btn {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: #1e1e2e;
  border: 1px solid #2a2a3e;
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-btn--on { background: rgba(240,192,96,0.25); border-color: #f0c060; }

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #444460;
  transition: transform 0.2s, background 0.2s;
}

.toggle-btn--on .toggle-thumb { transform: translateX(18px); background: #f0c060; }

.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid #14141e;
}

.field-row:last-child { border-bottom: none; }

.field-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; }

.admin-input {
  background: #14141e;
  border: 1px solid #2a2a3e;
  color: #a0a0b8;
  font-family: 'Martian Mono', monospace;
  font-size: 12px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  max-width: 480px;
}

.admin-input:focus { border-color: #f0c060; color: #e2e2e8; }

.save-row {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 8px;
}

.save-msg { font-size: 11px; color: #4ade80; }
</style>
