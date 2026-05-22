<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Posts' })

const { data: posts, refresh } = await useFetch<any[]>('/api/admin/posts')

const typeFilter = ref<'all' | 'blog' | 'project'>('all')

const filtered = computed(() => {
  if (!posts.value) return []
  if (typeFilter.value === 'all') return posts.value
  return posts.value.filter((p) => p.type === typeFilter.value)
})

const confirmDelete = ref<number | null>(null)

async function deletePost(id: number) {
  await $fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
  confirmDelete.value = null
  await refresh()
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div>
    <div class="posts-head">
      <p class="page-title">Posts & Projects</p>
      <NuxtLink to="/admin/posts/new" class="admin-btn admin-btn--primary">+ New post</NuxtLink>
    </div>

    <div class="filter-row">
      <button
        v-for="opt in ['all', 'blog', 'project'] as const"
        :key="opt"
        class="filter-btn"
        :class="{ 'filter-btn--active': typeFilter === opt }"
        @click="typeFilter = opt"
      >{{ opt }}</button>
    </div>

    <div class="posts-table">
      <div class="table-head">
        <span>Title</span>
        <span>Type</span>
        <span>Status</span>
        <span>Updated</span>
        <span></span>
      </div>

      <div v-for="post in filtered" :key="post.id" class="table-row">
        <span class="row-title">{{ post.title_ru || post.slug }}</span>
        <span class="row-type" :class="`row-type--${post.type}`">{{ post.type }}</span>
        <span class="row-status" :class="{ 'row-status--published': post.is_published }">
          {{ post.is_published ? 'published' : 'draft' }}
        </span>
        <span class="row-date">{{ fmtDate(post.updated_at) }}</span>
        <div class="row-actions">
          <NuxtLink :to="`/admin/posts/${post.id}`" class="admin-btn admin-btn--ghost">Edit</NuxtLink>
          <button
            v-if="confirmDelete !== post.id"
            class="admin-btn admin-btn--danger"
            @click="confirmDelete = post.id"
          >Delete</button>
          <div v-else class="confirm-delete">
            <span>Sure?</span>
            <button class="admin-btn admin-btn--danger" @click="deletePost(post.id)">Yes</button>
            <button class="admin-btn admin-btn--ghost" @click="confirmDelete = null">No</button>
          </div>
        </div>
      </div>

      <div v-if="!filtered.length" class="table-empty">No posts yet</div>
    </div>
  </div>
</template>

<style scoped>
.posts-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title { font-size: 22px; font-weight: 300; color: #e2e2e8; letter-spacing: -0.02em; }

.filter-row { display: flex; gap: 4px; margin-bottom: 20px; }

.filter-btn {
  font-family: inherit;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 5px 12px;
  border: 1px solid #1e1e2e;
  background: transparent;
  color: #666680;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover { color: #a0a0b8; }
.filter-btn--active { color: #f0c060; border-color: rgba(240,192,96,0.4); background: rgba(240,192,96,0.06); }

.posts-table {
  border: 1px solid #1e1e2e;
  background: #0d0d14;
}

.table-head {
  display: grid;
  grid-template-columns: 1fr 80px 90px 110px 200px;
  padding: 10px 20px;
  border-bottom: 1px solid #1e1e2e;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #444460;
  gap: 16px;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 80px 90px 110px 200px;
  padding: 12px 20px;
  border-bottom: 1px solid #14141e;
  align-items: center;
  gap: 16px;
  transition: background 0.1s;
}

.table-row:last-child { border-bottom: none; }
.table-row:hover { background: #10101a; }

.row-title { font-size: 12px; color: #c0c0d0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.row-type {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 6px;
  border: 1px solid;
}

.row-type--blog    { color: #60a0f0; border-color: rgba(96,160,240,0.3); background: rgba(96,160,240,0.06); }
.row-type--project { color: #a060f0; border-color: rgba(160,96,240,0.3); background: rgba(160,96,240,0.06); }

.row-status { font-size: 10px; letter-spacing: 0.06em; color: #444460; }
.row-status--published { color: #4ade80; }

.row-date { font-size: 10px; color: #444460; }

.row-actions { display: flex; align-items: center; gap: 6px; justify-content: flex-end; }

.confirm-delete { display: flex; align-items: center; gap: 6px; }
.confirm-delete span { font-size: 10px; color: #ff6b6b; }

.table-empty { padding: 40px 20px; text-align: center; font-size: 11px; color: #444460; }
</style>
