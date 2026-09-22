<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Posts' })

interface Row {
  id: number
  slug: string
  title_ru: string
  title_en: string
  type: 'blog' | 'project'
  is_published: boolean
  updated_at: string
}

const api     = useAdminApi()
const toast   = useAdminToast()
const confirm = useAdminConfirm()
const { date } = useAdminFormat()

const { data, refresh } = await useAsyncData<Row[]>(
  'admin-posts', () => api.get<Row[]>('/api/admin/posts'), { default: () => [] },
)

const type   = ref<'all' | 'blog' | 'project'>('all')
const status = ref<'all' | 'published' | 'draft'>('all')
const query  = ref('')

// Search over the list: there are more posts than fit on a screen, and the only
// filter before this was the type.
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (data.value ?? []).filter((p) => {
    if (type.value !== 'all' && p.type !== type.value) return false
    if (status.value === 'published' && !p.is_published) return false
    if (status.value === 'draft' && p.is_published) return false
    if (!q) return true
    return `${p.title_ru} ${p.title_en} ${p.slug}`.toLowerCase().includes(q)
  })
})

async function remove(post: Row) {
  const ok = await confirm.ask({
    title: 'Delete post?',
    text:  `«${post.title_ru || post.slug}» will be removed permanently.`,
  })
  if (!ok) return
  try {
    await api.remove(`/api/admin/posts/${post.id}`)
    await refresh()
    toast.ok('Post deleted')
  } catch (e) {
    toast.err(adminError(e))
  }
}

/** Publishing is toggled from the list — no reason to open the editor for one flag. */
async function togglePublish(post: Row) {
  const next = !post.is_published
  post.is_published = next
  try {
    await api.patch(`/api/admin/posts/${post.id}`, {
      is_published: next,
      published_at: next ? new Date().toISOString() : null,
    })
    toast.ok(next ? 'Published' : 'Moved to drafts')
  } catch (e) {
    post.is_published = !next
    toast.err(adminError(e))
  }
}
</script>

<template>
  <AdminPage title="Posts & Projects" :note="`${filtered.length} of ${data?.length ?? 0}`">
    <template #actions>
      <NuxtLink to="/admin/posts/new" class="admin-btn admin-btn--primary">+ New post</NuxtLink>
    </template>

    <div class="bar">
      <input v-model="query" class="admin-input bar__search" placeholder="Search by title or slug…">

      <div class="tabs">
        <button
          v-for="opt in (['all', 'blog', 'project'] as const)"
          :key="opt"
          class="tab"
          :class="{ 'tab--active': type === opt }"
          type="button"
          @click="type = opt"
        >{{ opt }}</button>
      </div>

      <div class="tabs">
        <button
          v-for="opt in (['all', 'published', 'draft'] as const)"
          :key="opt"
          class="tab"
          :class="{ 'tab--active': status === opt }"
          type="button"
          @click="status = opt"
        >{{ opt }}</button>
      </div>
    </div>

    <div class="admin-panel table">
      <div class="table__head">
        <span>Title</span>
        <span>Type</span>
        <span>Status</span>
        <span>Updated</span>
        <span />
      </div>

      <div v-for="post in filtered" :key="post.id" class="table__row">
        <NuxtLink :to="`/admin/posts/${post.id}`" class="cell-title">
          {{ post.title_ru || post.slug }}
          <code class="cell-title__slug">/{{ post.slug }}</code>
        </NuxtLink>

        <span class="badge" :class="`badge--${post.type}`">{{ post.type }}</span>

        <button
          class="status"
          :class="{ 'status--on': post.is_published }"
          type="button"
          :title="post.is_published ? 'Move to drafts' : 'Publish'"
          @click="togglePublish(post)"
        >
          <span class="status__dot" />
          {{ post.is_published ? 'published' : 'draft' }}
        </button>

        <span class="cell-date">{{ date(post.updated_at) }}</span>

        <div class="cell-actions">
          <NuxtLink :to="`/admin/posts/${post.id}`" class="admin-btn admin-btn--ghost">Edit</NuxtLink>
          <button class="admin-btn admin-btn--danger" type="button" @click="remove(post)">Delete</button>
        </div>
      </div>

      <p v-if="!filtered.length" class="table__empty">
        {{ data?.length ? 'Nothing matches the filters' : 'No posts yet' }}
      </p>
    </div>
  </AdminPage>
</template>

<style scoped>
.bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }

.bar__search {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text);
  background: var(--bg-1);
  border: 1px solid var(--border);
}

.tabs { display: flex; gap: 2px; padding: 2px; border: 1px solid var(--border); border-radius: var(--r-pill); }

.tab {
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 5px 11px;
  border: none;
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-4);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.tab:hover { color: var(--text-2); }
.tab--active { color: var(--accent); background: var(--accent-dim); }

.table { padding: 0; }

.table__head,
.table__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px 110px 100px auto;
  align-items: center;
  gap: 16px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border);
}

.table__head {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-4);
}

.table__row:last-child { border-bottom: none; }
.table__row:hover { background: var(--bg-2); }

.cell-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  font-size: 12.5px;
  color: var(--text-2);
  text-decoration: none;
}

.cell-title:hover { color: var(--accent); }

.cell-title__slug { font-size: 10px; color: var(--text-4); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.badge {
  justify-self: start;
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 7px;
  border: 1px solid var(--border-s);
  border-radius: var(--r-pill);
  background: var(--soft);
}

.badge--blog    { color: var(--blue); }
.badge--project { color: var(--purple); }

.status {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-4);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
}

.status:hover { color: var(--text-2); }
.status--on { color: var(--green); }

.status__dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.cell-date { font-size: 10px; color: var(--text-4); }

.cell-actions { display: flex; gap: 6px; justify-content: flex-end; }

.table__empty { padding: 40px 18px; text-align: center; font-size: 11.5px; color: var(--text-4); }

@media (max-width: 860px) {
  .table__head { display: none; }
  .table__row { grid-template-columns: 1fr auto; row-gap: 8px; }
  .cell-date { display: none; }
}
</style>
