<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — About' })

interface About { text_ru: string; text_en: string }

const { form, dirty, saving, save } = useAdminForm<About, About>({
  endpoint: '/api/admin/about',
  title:    'About',
  toForm: (d) => ({ text_ru: d?.text_ru ?? '', text_en: d?.text_en ?? '' }),
})

const lang    = ref<'ru' | 'en'>('ru')
const preview = ref(false)

const text = computed({
  get: () => (lang.value === 'ru' ? form.value.text_ru : form.value.text_en) ?? '',
  set: (v: string) => {
    if (lang.value === 'ru') form.value.text_ru = v
    else                     form.value.text_en = v
  },
})
</script>

<template>
  <AdminPage title="About me" :note="dirty ? 'Unsaved changes · ⌘S to save' : 'In sync'">
    <template #actions>
      <div class="lang-switch">
        <button
          v-for="l in (['ru', 'en'] as const)"
          :key="l"
          class="admin-btn"
          :class="lang === l ? 'admin-btn--primary' : 'admin-btn--ghost'"
          type="button"
          @click="lang = l"
        >{{ l.toUpperCase() }}</button>
      </div>
      <button class="admin-btn admin-btn--ghost" type="button" @click="preview = !preview">
        {{ preview ? 'Edit' : 'Preview' }}
      </button>
      <button class="admin-btn admin-btn--primary" type="button" :disabled="saving || !dirty" @click="save()">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </template>

    <div class="admin-panel">
      <!-- Текст хранится готовым HTML, поэтому превью — он сам. -->
        <div v-if="preview" class="preview prose" v-html="text" />
      <AdminField
        v-else
        v-model="text"
        :rows="20"
        type="textarea"
        :placeholder="`HTML, ${lang.toUpperCase()}`"
      />
    </div>
  </AdminPage>
</template>

<style scoped>
.lang-switch { display: flex; gap: 4px; }

.preview {
  min-height: 300px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
}

.preview :deep(p) { margin-bottom: 1em; }
.preview :deep(a) { color: var(--accent); }
</style>
