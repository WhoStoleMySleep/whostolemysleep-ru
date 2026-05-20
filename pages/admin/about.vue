<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — About' })

const raw = await $fetch<any>('/api/admin/about')

const form = reactive({
  text_ru: raw.text_ru ?? '',
  text_en: raw.text_en ?? '',
})

const lang    = ref<'ru' | 'en'>('ru')
const preview = ref(false)
const saving  = ref(false)
const saveMsg = ref('')
const error   = ref('')

async function save() {
  saving.value  = true
  saveMsg.value = ''
  error.value   = ''

  try {
    await $fetch('/api/admin/about', { method: 'PATCH', body: { text_ru: form.text_ru, text_en: form.text_en } })
    saveMsg.value = 'Saved — added to cache queue'
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="editor-head">
      <p class="editor-title">About me</p>
      <div class="editor-head__right">
        <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
        <span v-if="error"   class="save-error">{{ error }}</span>
        <button class="admin-btn admin-btn--primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <div class="lang-tabs">
      <button class="lang-tab" :class="{ 'lang-tab--active': lang === 'ru' }" @click="lang = 'ru'">RU</button>
      <button class="lang-tab" :class="{ 'lang-tab--active': lang === 'en' }" @click="lang = 'en'">EN</button>
    </div>

    <div class="field" style="margin-top: 20px;">
      <label class="field-label">
        Text {{ lang.toUpperCase() }} (HTML)
        <button class="preview-toggle" @click="preview = !preview">
          {{ preview ? 'Hide preview' : 'Preview' }}
        </button>
      </label>
      <div class="text-pane" :class="{ 'text-pane--split': preview }">
        <textarea
          v-if="lang === 'ru'"
          v-model="form.text_ru"
          class="field-input field-input--text"
          rows="20"
        />
        <textarea
          v-else
          v-model="form.text_en"
          class="field-input field-input--text"
          rows="20"
        />
        <div
          v-if="preview"
          class="text-preview"
          v-html="lang === 'ru' ? form.text_ru : form.text_en"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.editor-title { font-size: 22px; font-weight: 300; color: #e2e2e8; letter-spacing: -0.02em; flex: 1; }

.editor-head__right { display: flex; align-items: center; gap: 10px; }

.save-msg   { font-size: 11px; color: #4ade80; }
.save-error { font-size: 11px; color: #ff6b6b; }

.lang-tabs { display: flex; gap: 4px; }

.lang-tab {
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.1em;
  padding: 5px 14px;
  border: 1px solid #1e1e2e;
  background: transparent;
  color: #666680;
  cursor: pointer;
  transition: all 0.15s;
}

.lang-tab:hover { color: #a0a0b8; }
.lang-tab--active { color: #f0c060; border-color: rgba(240,192,96,0.4); background: rgba(240,192,96,0.06); }

.field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #666680;
}

.field-input {
  background: #0d0d14;
  border: 1px solid #1e1e2e;
  padding: 9px 12px;
  font-family: 'Martian Mono', monospace;
  font-size: 11px;
  color: #e2e2e8;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  resize: vertical;
  line-height: 1.6;
}

.field-input:focus { border-color: #f0c060; }
.field-input--text { min-height: 480px; }

.preview-toggle {
  font-family: inherit;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: #f0c060;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.text-pane { display: flex; gap: 16px; }
.text-pane--split .field-input--text { flex: 1; }

.text-preview {
  flex: 1;
  padding: 16px 20px;
  border: 1px solid #1e1e2e;
  background: #0a0a0f;
  font-size: 14px;
  line-height: 1.7;
  color: #a0a0b8;
  overflow-y: auto;
  max-height: 480px;
}
</style>
