<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route  = useRoute()
const router = useRouter()
const isNew  = route.params.id === 'new'

useHead({ title: isNew ? 'Admin — New post' : 'Admin — Edit post' })

interface PostImage { id: number; url: string; alt_ru: string; alt_en: string; position: number }

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

const images = ref<PostImage[]>([])

if (!isNew) {
  const post = await $fetch<any>(`/api/admin/posts/${route.params.id}`)
  Object.assign(form, {
    ...post,
    url:          post.url ?? '',
    published_at: post.published_at?.slice(0, 16) ?? '',
    tag_ids:      post.postTags.map((pt: any) => pt.tag.id),
  })
  images.value = post.images ?? []
}

const lang      = ref<'ru' | 'en'>('ru')
const preview   = ref(false)
const saving    = ref(false)
const saveMsg   = ref('')
const error     = ref('')
const uploading = ref(false)
const uploadErr = ref('')

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file) return
  input.value = ''

  uploading.value = true
  uploadErr.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { url } = await $fetch<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd })
    const postId = route.params.id as string
    const img = await $fetch<PostImage>(`/api/admin/posts/${postId}/images`, { method: 'POST', body: { url } })
    images.value.push(img)
  } catch (e: any) {
    uploadErr.value = e?.data?.message ?? 'Upload failed'
  } finally {
    uploading.value = false
  }
}

async function removeImage(id: number) {
  if (!confirm('Delete this image?')) return
  await $fetch(`/api/admin/images/${id}`, { method: 'DELETE' })
  images.value = images.value.filter((img) => img.id !== id)
}

async function saveAlt(img: PostImage) {
  await $fetch(`/api/admin/images/${img.id}`, {
    method: 'PATCH',
    body: { alt_ru: img.alt_ru, alt_en: img.alt_en },
  })
}

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

        <!-- Images -->
        <div v-if="!isNew" class="field">
          <label class="field-label">
            Images
            <span v-if="uploadErr" class="upload-err">{{ uploadErr }}</span>
          </label>

          <div class="images-grid">
            <div v-for="img in images" :key="img.id" class="img-card">
              <div class="img-card__preview">
                <img :src="img.url" :alt="img.alt_ru" />
                <button class="img-card__del" @click="removeImage(img.id)">×</button>
                <span v-if="img.position === 0" class="img-card__cover">cover</span>
              </div>
              <input
                v-model="img.alt_ru"
                class="field-input img-alt"
                placeholder="Alt RU"
                @blur="saveAlt(img)"
              />
              <input
                v-model="img.alt_en"
                class="field-input img-alt"
                placeholder="Alt EN"
                @blur="saveAlt(img)"
              />
            </div>

            <label class="img-upload" :class="{ 'img-upload--loading': uploading }">
              <input type="file" accept="image/*" @change="uploadImage" />
              <span>{{ uploading ? 'Uploading...' : '+ Upload' }}</span>
            </label>
          </div>
        </div>

        <p v-if="isNew" class="field-hint">Save the post first to upload images</p>

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

.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.img-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 180px;
}

.img-card__preview {
  position: relative;
  width: 180px;
  height: 120px;
  background: #0d0d14;
  border: 1px solid #1e1e2e;
  overflow: hidden;
}

.img-card__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-card__del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  background: rgba(10,10,18,0.8);
  border: 1px solid #3a1a1a;
  color: #ff6b6b;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.img-card__del:hover { background: #1e0f0f; }

.img-card__cover {
  position: absolute;
  bottom: 4px;
  left: 4px;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #f0c060;
  background: rgba(10,10,18,0.8);
  padding: 2px 5px;
  border: 1px solid rgba(240,192,96,0.3);
}

.img-alt { font-size: 11px; padding: 5px 8px; }

.img-upload {
  width: 180px;
  height: 120px;
  border: 1px dashed #2a2a3e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s;
  color: #444460;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.img-upload:hover { border-color: #f0c060; color: #f0c060; }
.img-upload--loading { opacity: 0.5; pointer-events: none; }
.img-upload input { display: none; }

.upload-err { color: #ff6b6b; font-size: 10px; font-weight: normal; text-transform: none; letter-spacing: 0; }
.field-hint { font-size: 10px; color: #444460; }
</style>
