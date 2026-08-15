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
  color: var(--text);
  margin-bottom: 32px;
}

.section-title {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-4);
  margin-bottom: 16px;
}

.settings-section {
  border: 1px solid var(--border);
  background: var(--bg-1);
  padding: 20px 24px;
  margin-bottom: 20px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  gap: 24px;
}

.toggle-row:last-child { border-bottom: none; }

.toggle-label { display: flex; flex-direction: column; gap: 4px; }
.toggle-label__text { font-size: 13px; color: var(--text-3); }
.toggle-label__desc { font-size: 11px; color: var(--text-4); }

.toggle-btn {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--border);
  border: 1px solid var(--border-s);
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-btn--on { background: var(--accent-line); border-color: var(--accent); }

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--bg-3);
  transition: transform 0.2s, background 0.2s;
}

.toggle-btn--on .toggle-thumb { transform: translateX(18px); background: var(--accent); }

.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.field-row:last-child { border-bottom: none; }

.field-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-4); }

.admin-input {
  background: var(--bg-3);
  border: 1px solid var(--border-s);
  color: var(--text-3);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  max-width: 480px;
}

.admin-input:focus { border-color: var(--accent); color: var(--text); }

.save-row {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 8px;
}

.save-msg { font-size: 11px; color: var(--green); }
</style>
