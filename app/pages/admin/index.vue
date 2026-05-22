<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Dashboard' })

interface Pending { path: string; added_at: string }

const { data: pending, refresh: refreshPending } = await useFetch<Pending[]>('/api/admin/pending')
const { data: posts } = await useFetch<any[]>('/api/admin/posts')

const flushing = ref(false)
const flushMsg = ref('')

const publishedCount = computed(() => posts.value?.filter((p) => p.is_published).length ?? 0)
const draftCount     = computed(() => posts.value?.filter((p) => !p.is_published).length ?? 0)

async function flush() {
  flushing.value = true
  flushMsg.value = ''
  try {
    const res = await $fetch<{ cleared: string[] }>('/api/admin/revalidate', { method: 'POST' })
    flushMsg.value = `Cleared ${res.cleared.length} path(s)`
    await refreshPending()
  } catch (e: any) {
    flushMsg.value = e?.data?.message ?? 'Error'
  } finally {
    flushing.value = false
  }
}
</script>

<template>
  <div>
    <div class="dash-title">Dashboard</div>

    <div class="stats-row">
      <div class="stat-card">
        <p class="stat-card__val">{{ publishedCount }}</p>
        <p class="stat-card__label">Published</p>
      </div>
      <div class="stat-card">
        <p class="stat-card__val">{{ draftCount }}</p>
        <p class="stat-card__label">Drafts</p>
      </div>
      <div class="stat-card" :class="{ 'stat-card--warn': (pending?.length ?? 0) > 0 }">
        <p class="stat-card__val">{{ pending?.length ?? 0 }}</p>
        <p class="stat-card__label">Pending flush</p>
      </div>
    </div>

    <div class="cache-panel">
      <div class="cache-panel__head">
        <p class="section-title">Cache queue</p>
        <div class="cache-panel__actions">
          <span v-if="flushMsg" class="flush-msg">{{ flushMsg }}</span>
          <button
            class="admin-btn admin-btn--primary"
            :disabled="!pending?.length || flushing"
            @click="flush"
          >
            {{ flushing ? 'Flushing...' : `Flush cache (${pending?.length ?? 0})` }}
          </button>
        </div>
      </div>

      <div v-if="!pending?.length" class="cache-empty">
        No pending invalidations — cache is in sync
      </div>

      <ul v-else class="cache-list">
        <li v-for="item in pending" :key="item.path" class="cache-item">
          <code class="cache-item__path">{{ item.path }}</code>
          <span class="cache-item__date">{{ new Date(item.added_at).toLocaleString() }}</span>
        </li>
      </ul>
    </div>

    <div class="quick-links">
      <p class="section-title">Quick links</p>
      <div class="quick-row">
        <NuxtLink to="/admin/posts" class="quick-card">
          <span class="quick-card__label">Posts & Projects</span>
          <span class="quick-card__count">{{ (posts?.length ?? 0) }} total</span>
        </NuxtLink>
        <NuxtLink to="/admin/about" class="quick-card">
          <span class="quick-card__label">About me</span>
        </NuxtLink>
        <NuxtLink to="/admin/experience" class="quick-card">
          <span class="quick-card__label">Experience</span>
        </NuxtLink>
        <NuxtLink to="/admin/education" class="quick-card">
          <span class="quick-card__label">Education</span>
        </NuxtLink>
        <NuxtLink to="/admin/skills" class="quick-card">
          <span class="quick-card__label">Skills</span>
        </NuxtLink>
        <NuxtLink to="/admin/settings" class="quick-card">
          <span class="quick-card__label">Settings</span>
        </NuxtLink>
      </div>
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

.stats-row { display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap; }

.stat-card {
  flex: 1;
  min-width: 120px;
  padding: 20px 24px;
  border: 1px solid #1e1e2e;
  background: #0d0d14;
}

.stat-card--warn { border-color: rgba(240,192,96,0.4); background: rgba(240,192,96,0.04); }

.stat-card__val {
  font-size: 32px;
  font-weight: 300;
  color: #e2e2e8;
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-card--warn .stat-card__val { color: #f0c060; }

.stat-card__label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #666680; }

.section-title {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #666680;
  margin-bottom: 16px;
}

.cache-panel {
  border: 1px solid #1e1e2e;
  background: #0d0d14;
  margin-bottom: 40px;
}

.cache-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #1e1e2e;
}

.cache-panel__head .section-title { margin-bottom: 0; }

.cache-panel__actions { display: flex; align-items: center; gap: 12px; }

.flush-msg { font-size: 11px; color: #4ade80; }

.cache-empty { padding: 24px 20px; font-size: 11px; color: #444460; }

.cache-list { list-style: none; }

.cache-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid #14141e;
  gap: 16px;
}

.cache-item:last-child { border-bottom: none; }

.cache-item__path { color: #f0c060; font-size: 12px; }

.cache-item__date { font-size: 10px; color: #444460; white-space: nowrap; }

.quick-links { margin-top: 8px; }

.quick-row { display: flex; gap: 16px; flex-wrap: wrap; }

.quick-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 24px;
  border: 1px solid #1e1e2e;
  background: #0d0d14;
  text-decoration: none;
  transition: border-color 0.15s, background 0.15s;
  min-width: 180px;
}

.quick-card:hover { border-color: #333350; background: #12121a; }

.quick-card__label { font-size: 13px; color: #a0a0b8; }
.quick-card__count { font-size: 11px; color: #666680; }
</style>
