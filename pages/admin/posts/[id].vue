<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route  = useRoute()
const router = useRouter()
const isNew  = route.params.id === 'new'

useHead({ title: isNew ? 'Admin — New post' : 'Admin — Edit post' })

const { data: allTags } = await useFetch<any[]>('/api/admin/tags')

const form = reactive({
  slug:         '',
  type:         'blog' as 'blog' | 'project',
  title_ru:     '',
  title_en:     '',
  excerpt_ru:   '',
  excerpt_en:   '',
  text_ru:      '',
  text_en:      '',
  url:          '',
  is_published: false,
  published_at: '',
  tag_ids:      [] as number[],
})

if (!isNew) {
  const post = await $fetch<any>(`/api/admin/posts/${route.params.id}`)
  Object.assign(form, {
    ...post,
    url:          post.url ?? '',
    published_at: post.published_at?.slice(0, 16) ?? '',
    tag_ids:      post.postTags.map((pt: any) => pt.tag.id),
  })
}

const lang    = ref<'ru' | 'en'>('ru')
const preview = ref(false)
const saving  = ref(false)
const saveMsg = ref('')
const error   = ref('')

const previewHtml = computed(() => lang.value === 'ru' ? form.text_ru : form.text_en)

function toggleTag(id: number) {
  const idx = form.tag_ids.indexOf(id)
  if (idx >= 0) form.tag_ids.splice(idx, 1)
  else form.tag_ids.push(id)
}

async function save() {
  saving.value = true
  saveMsg.value = ''
  error.value   = ''

  const body = {
    ...form,
    url:          form.url || null,
    published_at: form.published_at || null,
  }

  try {
    if (isNew) {
      const created = await $fetch<any>('/api/admin/posts', { method: 'POST', body })
      router.replace(`/admin/posts/${created.id}`)
    } else {
      await $fetch(`/api/admin/posts/${route.params.id}`, { method: 'PATCH', body })
    }
    saveMsg.value = 'Saved — added to cache queue'
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="editor">
    <div class="editor-head">
      <NuxtLink to="/admin/posts" class="back-link">← Posts</NuxtLink>
      <p class="editor-title">{{ isNew ? 'New post' : 'Edit post' }}</p>
      <div class="editor-head__right">
        <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
        <span v-if="error"   class="save-error">{{ error }}</span>
        <button class="admin-btn admin-btn--primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <div class="editor-body">
      <!-- Left: form -->
      <div class="editor-fields">

        <!-- Meta row -->
        <div class="field-row">
          <div class="field">
            <label class="field-label">Slug</label>
            <input v-model="form.slug" class="field-input" type="text" placeholder="my-post-slug" />
          </div>
          <div class="field field--narrow">
            <label class="field-label">Type</label>
            <select v-model="form.type" class="field-input">
              <option value="blog">Blog</option>
              <option value="project">Project</option>
            </select>
          </div>
          <div class="field field--narrow">
            <label class="field-label">Published</label>
            <label class="toggle">
              <input v-model="form.is_published" type="checkbox" />
              <span>{{ form.is_published ? 'Yes' : 'No' }}</span>
            </label>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label class="field-label">Published at</label>
            <input v-model="form.published_at" class="field-input" type="datetime-local" />
          </div>
          <div class="field">
            <label class="field-label">External URL (projects)</label>
            <input v-model="form.url" class="field-input" type="url" placeholder="https://..." />
          </div>
        </div>

        <!-- Lang tabs -->
        <div class="lang-tabs">
          <button class="lang-tab" :class="{ 'lang-tab--active': lang === 'ru' }" @click="lang = 'ru'">RU</button>
          <button class="lang-tab" :class="{ 'lang-tab--active': lang === 'en' }" @click="lang = 'en'">EN</button>
        </div>

        <div v-show="lang === 'ru'" class="lang-fields">
          <div class="field">
            <label class="field-label">Title RU</label>
            <input v-model="form.title_ru" class="field-input" type="text" />
          </div>
          <div class="field">
            <label class="field-label">Excerpt RU</label>
            <textarea v-model="form.excerpt_ru" class="field-input field-input--sm" rows="2" />
          </div>
          <div class="field">
            <label class="field-label">
              Text RU (HTML)
              <button class="preview-toggle" @click="preview = !preview">
                {{ preview ? 'Hide preview' : 'Preview' }}
              </button>
            </label>
            <div class="text-pane" :class="{ 'text-pane--split': preview }">
              <textarea v-model="form.text_ru" class="field-input field-input--text" rows="20" />
              <div v-if="preview" class="text-preview" v-html="previewHtml" />
            </div>
          </div>
        </div>

        <div v-show="lang === 'en'" class="lang-fields">
          <div class="field">
            <label class="field-label">Title EN</label>
            <input v-model="form.title_en" class="field-input" type="text" />
          </div>
          <div class="field">
            <label class="field-label">Excerpt EN</label>
            <textarea v-model="form.excerpt_en" class="field-input field-input--sm" rows="2" />
          </div>
          <div class="field">
            <label class="field-label">
              Text EN (HTML)
              <button class="preview-toggle" @click="preview = !preview">
                {{ preview ? 'Hide preview' : 'Preview' }}
              </button>
            </label>
            <div class="text-pane" :class="{ 'text-pane--split': preview }">
              <textarea v-model="form.text_en" class="field-input field-input--text" rows="20" />
              <div v-if="preview" class="text-preview" v-html="previewHtml" />
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div class="field">
          <label class="field-label">Tags</label>
          <div class="tags-list">
            <label
              v-for="tag in allTags"
              :key="tag.id"
              class="tag-check"
              :class="{ 'tag-check--active': form.tag_ids.includes(tag.id) }"
            >
              <input type="checkbox" :checked="form.tag_ids.includes(tag.id)" @change="toggleTag(tag.id)" />
              {{ tag.name_ru }}
            </label>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.back-link { font-size: 11px; color: #666680; text-decoration: none; transition: color 0.15s; }
.back-link:hover { color: #a0a0b8; }

.editor-title { font-size: 18px; font-weight: 300; color: #e2e2e8; letter-spacing: -0.02em; flex: 1; }

.editor-head__right { display: flex; align-items: center; gap: 10px; }

.save-msg   { font-size: 11px; color: #4ade80; }
.save-error { font-size: 11px; color: #ff6b6b; }

.editor-fields { display: flex; flex-direction: column; gap: 20px; }

.field-row { display: flex; gap: 16px; flex-wrap: wrap; }

.field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
.field--narrow { flex: 0 0 160px; min-width: 160px; }

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
  font-size: 12px;
  color: #e2e2e8;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  resize: vertical;
}

.field-input:focus { border-color: #f0c060; }
.field-input--sm   { min-height: 60px; }
.field-input--text { min-height: 400px; font-size: 11px; line-height: 1.6; }

.toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.toggle input { accent-color: #f0c060; width: 14px; height: 14px; }
.toggle span { font-size: 12px; color: #a0a0b8; }

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

.lang-fields { display: flex; flex-direction: column; gap: 16px; }

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
  padding: 12px 16px;
  border: 1px solid #1e1e2e;
  background: #0a0a0f;
  font-size: 13px;
  line-height: 1.7;
  color: #a0a0b8;
  overflow-y: auto;
  max-height: 400px;
}

.tags-list { display: flex; flex-wrap: wrap; gap: 8px; }

.tag-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #666680;
  padding: 4px 10px;
  border: 1px solid #1e1e2e;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-check input { display: none; }
.tag-check--active { color: #f0c060; border-color: rgba(240,192,96,0.4); background: rgba(240,192,96,0.06); }
.tag-check:hover { color: #a0a0b8; }
</style>
