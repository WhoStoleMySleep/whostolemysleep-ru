<script setup lang="ts">
defineI18nRoute(false)
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Admin — Dashboard' })

interface Stats {
  posts:      { total: number; published: number; drafts: number }
  pending:    number
  missing_en: Record<EnSection, number> & { total: number }
}
type EnSection = 'posts' | 'about' | 'experience' | 'bullets' | 'education' | 'skills' | 'tags'
interface Pending { path: string; added_at: string }
interface Flush {
  ok:      boolean
  cleared: string[]
  failed:  { path: string; reason: string }[]
}

const api   = useAdminApi()
const toast = useAdminToast()

// Числа приходят посчитанными с сервера. Раньше дашборд ради трёх цифр
// выкачивал все посты со всеми текстами и считал их на клиенте.
const { data: stats, refresh: refreshStats } = await useAsyncData(
  'admin-stats', () => api.get<Stats>('/api/admin/stats'),
)
const { data: pending, refresh: refreshPending } = await useAsyncData(
  'admin-pending', () => api.get<Pending[]>('/api/admin/pending'), { default: () => [] },
)

/** Где правится английский каждого раздела — счётчик без ссылки бесполезен. */
const EN_SECTIONS: { key: EnSection; label: string; to: string }[] = [
  { key: 'posts',      label: 'Posts',      to: '/admin/posts' },
  { key: 'about',      label: 'About',      to: '/admin/about' },
  { key: 'experience', label: 'Experience', to: '/admin/experience' },
  { key: 'bullets',    label: 'Bullets',    to: '/admin/experience' },
  { key: 'education',  label: 'Education',  to: '/admin/education' },
  { key: 'skills',     label: 'Skills',     to: '/admin/skills' },
  { key: 'tags',       label: 'Tags',       to: '/admin/posts' },
]

const enGaps = computed(() => EN_SECTIONS
  .map((section) => ({ ...section, n: stats.value?.missing_en?.[section.key] ?? 0 }))
  .filter((section) => section.n > 0))

const flushing = ref(false)

async function flush() {
  flushing.value = true
  try {
    const res = await api.post<Flush>('/api/admin/revalidate', {})
    // Провалы показываем отдельно: раньше кнопка всегда отчитывалась об
    // успехе, даже когда кеш на самом деле не сбрасывался.
    if (res.failed.length) {
      const first = res.failed[0]!
      toast.err(`${res.failed.length} failed — ${first.path}: ${first.reason}`)
    } else {
      toast.ok(`Revalidated ${res.cleared.length} path(s)`)
    }
    await Promise.all([refreshPending(), refreshStats()])
  } catch (e) {
    toast.err(adminError(e))
  } finally {
    flushing.value = false
  }
}

const { date } = useAdminFormat()
</script>

<template>
  <AdminPage title="Dashboard">
    <div class="stats">
      <div class="stat">
        <p class="stat__val">{{ stats?.posts.published ?? 0 }}</p>
        <p class="stat__label">Published</p>
      </div>
      <div class="stat">
        <p class="stat__val">{{ stats?.posts.drafts ?? 0 }}</p>
        <p class="stat__label">Drafts</p>
      </div>
      <div class="stat" :class="{ 'stat--warn': (stats?.pending ?? 0) > 0 }">
        <p class="stat__val">{{ stats?.pending ?? 0 }}</p>
        <p class="stat__label">Pending flush</p>
      </div>
      <div class="stat">
        <p class="stat__val">{{ stats?.missing_en?.total ?? 0 }}</p>
        <p class="stat__label">Missing EN</p>
      </div>
    </div>

    <div class="admin-panel panel panel--en">
      <div class="panel__head">
        <p class="panel__title">English gaps</p>
      </div>

      <p v-if="!enGaps.length" class="panel__empty">Every English field is filled in</p>

      <ul v-else class="queue">
        <li v-for="section in enGaps" :key="section.label" class="queue__item">
          <NuxtLink :to="section.to" class="queue__link">{{ section.label }}</NuxtLink>
          <span class="queue__date">{{ section.n }} without translation</span>
        </li>
      </ul>
    </div>

    <div class="admin-panel panel">
      <div class="panel__head">
        <p class="panel__title">Cache queue</p>
        <button
          class="admin-btn admin-btn--primary"
          type="button"
          :disabled="!pending?.length || flushing"
          @click="flush"
        >
          {{ flushing ? 'Flushing…' : `Flush cache (${pending?.length ?? 0})` }}
        </button>
      </div>

      <p v-if="!pending?.length" class="panel__empty">No pending invalidations — cache is in sync</p>

      <ul v-else class="queue">
        <li v-for="item in pending" :key="item.path" class="queue__item">
          <code class="queue__path">{{ item.path }}</code>
          <span class="queue__date">{{ date(item.added_at) }}</span>
        </li>
      </ul>
    </div>
  </AdminPage>
</template>

<style scoped>
.stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }

.stat {
  flex: 1;
  min-width: 120px;
  padding: 18px 20px;
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  background: var(--bg-1);
}

.stat--warn { border-color: var(--accent); background: var(--accent-glow); }

.stat__val {
  font-size: 30px;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text);
  margin-bottom: 6px;
}

.stat--warn .stat__val { color: var(--accent); }

.stat__label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-4); }

.panel { padding: 0; }
.panel--en { margin-bottom: 12px; }

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.panel__title { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-4); }

.panel__empty { padding: 22px 18px; font-size: 11.5px; color: var(--text-4); }

.queue { list-style: none; }

.queue__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 18px;
  border-bottom: 1px solid var(--border);
}

.queue__item:last-child { border-bottom: none; }
.queue__path { font-size: 12px; color: var(--accent); }

.queue__link {
  font-size: 12px;
  color: var(--text);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
}

.queue__link:hover { color: var(--accent); border-color: var(--accent); }
.queue__date { font-size: 10px; color: var(--text-4); white-space: nowrap; }
</style>
