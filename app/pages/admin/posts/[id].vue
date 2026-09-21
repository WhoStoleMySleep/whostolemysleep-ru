<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route  = useRoute()
const router = useRouter()

const api     = useAdminApi()
const toast   = useAdminToast()
const confirm = useAdminConfirm()

/** Для новой записи id ещё нет — он появится после первого сохранения. */
const postId = ref<string | null>(route.params.id === 'new' ? null : String(route.params.id))
const isNew  = computed(() => postId.value === null)

useHead({ title: () => (isNew.value ? 'Admin — New post' : 'Admin — Edit post') })

interface PostImage { id: number; url: string; alt_ru: string; alt_en: string; position: number }
interface Tag { id: number; slug: string; name_ru: string; name_en: string }

interface Form {
  slug: string
  type: 'blog' | 'project'
  title_ru: string; title_en: string
  excerpt_ru: string; excerpt_en: string
  text_ru: string; text_en: string
  url: string
  is_published: boolean
  published_at: string
  tag_ids: number[]
}

const blank = (): Form => ({
  slug: '', type: 'blog',
  title_ru: '', title_en: '',
  excerpt_ru: '', excerpt_en: '',
  text_ru: '', text_en: '',
  url: '', is_published: false, published_at: '',
  tag_ids: [],
})

const { data: allTags } = await useAsyncData<Tag[]>(
  'admin-tags', () => api.get<Tag[]>('/api/admin/tags'), { default: () => [] },
)

const form   = ref<Form>(blank())
const images = ref<PostImage[]>([])

if (!isNew.value) {
  const post = await api.get<Record<string, any>>(`/api/admin/posts/${postId.value}`)
  form.value = {
    ...blank(),
    ...post,
    url:          post.url ?? '',
    published_at: post.published_at?.slice(0, 16) ?? '',
    tag_ids:      (post.postTags ?? []).map((pt: { tag: Tag }) => pt.tag.id),
  }
  images.value = post.images ?? []
}

/* ── Несохранённые изменения ──
   Прежний редактор молча терял текст при уходе со страницы. */

const snapshot = ref(JSON.stringify(form.value))
const dirty    = computed(() => JSON.stringify(form.value) !== snapshot.value)

const lang    = ref<'ru' | 'en'>('ru')
const preview = ref(false)
const saving  = ref(false)

const body = computed(() => ({
  ...form.value,
  url:          form.value.url || null,
  published_at: form.value.published_at || null,
}))

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    if (isNew.value) {
      const created = await api.post<{ id: number }>('/api/admin/posts', body.value)
      postId.value = String(created.id)
      // replace, а не push: возврат назад не должен вести на пустую форму.
      await router.replace(`/admin/posts/${created.id}`)
    } else {
      await api.patch(`/api/admin/posts/${postId.value}`, body.value)
    }
    snapshot.value = JSON.stringify(form.value)
    toast.ok('Saved — added to cache queue')
  } catch (e) {
    toast.err(adminError(e))
  } finally {
    saving.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) e.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', onBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', onBeforeUnload)
})

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  return confirm.ask({
    title:  'Leave without saving?',
    text:   'Unsaved changes will be lost.',
    action: 'Leave',
  })
})

/* ── Теги ── */

function toggleTag(id: number) {
  const idx = form.value.tag_ids.indexOf(id)
  if (idx >= 0) form.value.tag_ids.splice(idx, 1)
  else form.value.tag_ids.push(id)
}

/* ── Картинки ── */

const uploading = ref(false)

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file  = input.files?.[0]
  if (!file || !postId.value) return
  input.value = ''

  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const { url } = await api.call<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd } as never)
    const img = await api.post<PostImage>(`/api/admin/posts/${postId.value}/images`, { url })
    images.value.push(img)
    toast.ok('Image uploaded')
  } catch (e) {
    toast.err(adminError(e))
  } finally {
    uploading.value = false
  }
}

async function removeImage(img: PostImage) {
  const ok = await confirm.ask({ title: 'Delete image?', text: 'It will be removed from the post.' })
  if (!ok) return
  try {
    await api.remove(`/api/admin/images/${img.id}`)
    images.value = images.value.filter((x) => x.id !== img.id)
  } catch (e) {
    toast.err(adminError(e))
  }
}

async function saveAlt(img: PostImage) {
  try {
    await api.patch(`/api/admin/images/${img.id}`, { alt_ru: img.alt_ru, alt_en: img.alt_en })
  } catch (e) {
    toast.err(adminError(e))
  }
}

const previewHtml = computed(() => (lang.value === 'ru' ? form.value.text_ru : form.value.text_en))
</script>

<template>
  <AdminPage
    :title="isNew ? 'New post' : form.title_ru || form.slug || 'Edit post'"
    :note="dirty ? 'Unsaved changes · ⌘S to save' : 'In sync'"
  >
    <template #actions>
      <NuxtLink to="/admin/posts" class="admin-btn admin-btn--ghost">← Posts</NuxtLink>
      <a
        v-if="!isNew && form.slug"
        class="admin-btn admin-btn--ghost"
        :href="`/ru/${form.type === 'project' ? 'projects' : 'blog'}/${form.slug}`"
        target="_blank"
      >View</a>
      <button class="admin-btn admin-btn--primary" type="button" :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </template>

    <div class="admin-panel block">
      <div class="admin-grid">
        <AdminField v-model="form.slug" label="Slug" required placeholder="my-post-slug" />

        <AdminField label="Type">
          <select v-model="form.type" class="admin-input select">
            <option value="blog">Blog</option>
            <option value="project">Project</option>
          </select>
        </AdminField>

        <AdminField label="Published at">
          <input v-model="form.published_at" class="admin-input select" type="datetime-local">
        </AdminField>

        <AdminField v-model="form.url" label="External URL (projects)" type="url" placeholder="https://…" />
      </div>

      <AdminField v-model="form.is_published" type="checkbox" label="Published — visible on the site" />
    </div>

    <div class="admin-panel block">
      <div class="block__head">
        <div class="tabs">
          <button
            v-for="l in (['ru', 'en'] as const)"
            :key="l"
            class="tab"
            :class="{ 'tab--active': lang === l }"
            type="button"
            @click="lang = l"
          >{{ l.toUpperCase() }}</button>
        </div>
        <button class="link-btn" type="button" @click="preview = !preview">
          {{ preview ? 'Hide preview' : 'Preview' }}
        </button>
      </div>

      <template v-if="lang === 'ru'">
        <AdminField v-model="form.title_ru" label="Title RU" required />
        <AdminField v-model="form.excerpt_ru" label="Excerpt RU" type="textarea" :rows="2" />
      </template>
      <template v-else>
        <AdminField v-model="form.title_en" label="Title EN" />
        <AdminField v-model="form.excerpt_en" label="Excerpt EN" type="textarea" :rows="2" />
      </template>

      <AdminField :label="`Text ${lang.toUpperCase()} (HTML)`">
        <div class="pane" :class="{ 'pane--split': preview }">
          <textarea
            v-if="lang === 'ru'"
            v-model="form.text_ru"
            class="admin-input pane__area"
            rows="20"
          />
          <textarea
            v-else
            v-model="form.text_en"
            class="admin-input pane__area"
            rows="20"
          />
          <!-- Текст хранится готовым HTML, поэтому превью — он сам. -->
          <div v-if="preview" class="pane__preview prose" v-html="previewHtml" />
        </div>
      </AdminField>
    </div>

    <div class="admin-panel block">
      <p class="block__title">Tags</p>
      <div class="tags">
        <button
          v-for="tag in allTags"
          :key="tag.id"
          class="chip"
          :class="{ 'chip--active': form.tag_ids.includes(tag.id) }"
          type="button"
          @click="toggleTag(tag.id)"
        >{{ tag.name_ru }}</button>
        <p v-if="!allTags?.length" class="hint">No tags yet</p>
      </div>
    </div>

    <div class="admin-panel block">
      <p class="block__title">Images</p>

      <p v-if="isNew" class="hint">Save the post first to upload images</p>

      <div v-else class="images">
        <div v-for="img in images" :key="img.id" class="img">
          <div class="img__frame">
            <img :src="img.url" :alt="img.alt_ru">
            <button class="img__del" type="button" aria-label="Delete image" @click="removeImage(img)">×</button>
            <span v-if="img.position === 0" class="img__cover">cover</span>
          </div>
          <input v-model="img.alt_ru" class="admin-input img__alt" placeholder="Alt RU" @blur="saveAlt(img)">
          <input v-model="img.alt_en" class="admin-input img__alt" placeholder="Alt EN" @blur="saveAlt(img)">
        </div>

        <label class="img__upload" :class="{ 'img__upload--busy': uploading }">
          <input type="file" accept="image/*" @change="uploadImage">
          <span>{{ uploading ? 'Uploading…' : '+ Upload' }}</span>
        </label>
      </div>
    </div>
  </AdminPage>
</template>

<style scoped>
.block { margin-bottom: 16px; display: flex; flex-direction: column; gap: 16px; }

.block__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

.block__title { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-4); }

.select {
  width: 100%;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
}

.tabs { display: flex; gap: 2px; padding: 2px; border: 1px solid var(--border); border-radius: var(--r-pill); }

.tab {
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.12em;
  padding: 5px 14px;
  border: none;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-4);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.tab--active { color: var(--accent); background: var(--accent-dim); }

.link-btn {
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
}

.pane { display: flex; gap: 14px; }

.pane__area {
  flex: 1;
  min-width: 0;
  min-height: 420px;
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  resize: vertical;
}

.pane__preview {
  flex: 1;
  min-width: 0;
  max-height: 420px;
  overflow-y: auto;
  padding: 14px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-3);
}

@media (max-width: 860px) {
  .pane { flex-direction: column; }
}

.tags { display: flex; flex-wrap: wrap; gap: 6px; }

.chip {
  font-family: inherit;
  font-size: 11px;
  color: var(--text-4);
  padding: 5px 11px;
  border: 1px solid var(--border);
  border-radius: var(--r-pill);
  background: transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.chip:hover { color: var(--text-2); }
.chip--active { color: var(--accent); border-color: var(--accent-line); background: var(--accent-dim); }

.hint { font-size: 10.5px; color: var(--text-4); }

.images { display: flex; flex-wrap: wrap; gap: 12px; }

.img { display: flex; flex-direction: column; gap: 6px; width: 180px; }

.img__frame {
  position: relative;
  width: 180px;
  height: 120px;
  overflow: hidden;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
}

.img__frame img { width: 100%; height: 100%; object-fit: cover; }

.img__del {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 22px;
  height: 22px;
  display: grid;
  place-content: center;
  font-size: 15px;
  line-height: 1;
  color: var(--red);
  background: var(--overlay-bg);
  border: 1px solid var(--red-border);
  border-radius: var(--r-s);
  cursor: pointer;
}

.img__del:hover { background: var(--red-bg); }

.img__cover {
  position: absolute;
  bottom: 5px;
  left: 5px;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--overlay-bg);
  border: 1px solid var(--accent-line);
  border-radius: var(--r-pill);
  padding: 2px 6px;
}

.img__alt {
  padding: 5px 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
}

.img__upload {
  width: 180px;
  height: 120px;
  display: grid;
  place-content: center;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-4);
  border: 1px dashed var(--border-s);
  border-radius: var(--r-s);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.img__upload:hover { color: var(--accent); border-color: var(--accent); }
.img__upload--busy { opacity: 0.5; pointer-events: none; }
.img__upload input { display: none; }
</style>
