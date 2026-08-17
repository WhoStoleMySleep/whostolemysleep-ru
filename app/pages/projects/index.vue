<script setup lang="ts">
import type { Post } from '~/types'

const { locale, t } = useLocale()

useSeoMeta({
  title:       () => t('seo.projects_title'),
  description: () => t('seo.projects_desc'),
})

const { data: projects, pending } = await useAsyncData(
  () => `posts-project-${locale.value}`,
  () => $fetch<Post[]>('/api/posts/project', { query: { locale: locale.value } }),
  { lazy: true },
)

const activeTag = ref<string | null>(null)

/** Тег → сколько проектов с ним, за один проход вместо filter в цикле. */
const tagCounts = computed(() => {
  const counts = new Map<string, number>()
  projects.value?.forEach(p =>
    p.tags.forEach(tag => counts.set(tag.name, (counts.get(tag.name) ?? 0) + 1)),
  )
  return counts
})

const filters = computed(() => [
  { name: null as string | null, label: t('projects.all'), count: projects.value?.length ?? 0 },
  ...Array.from(tagCounts.value.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, label: name, count })),
])

const filtered = computed(() => {
  if (!activeTag.value) return projects.value ?? []
  return (projects.value ?? []).filter(p => p.tags.some(tag => tag.name === activeTag.value))
})
</script>

<template>
  <div class="projects-page">
    <UiPageHeader
      :eyebrow="t('projects.eyebrow')"
      num="02"
      :title="t('projects.title')"
      :subtitle="t('projects.subtitle')"
    />

    <div v-if="filters.length > 1" class="filters">
      <button
        v-for="f in filters"
        :key="f.label"
        class="filters__pill"
        :class="{ 'filters__pill--active': activeTag === f.name }"
        type="button"
        @click="activeTag = f.name"
      >
        {{ f.label }} <span class="filters__count">{{ f.count }}</span>
      </button>
    </div>

    <div v-if="pending" class="loading" aria-live="polite">
      <span v-for="i in 3" :key="i" class="loading__dot" />
    </div>

    <p v-else-if="!filtered.length" class="empty">{{ t('projects.empty') }}</p>

    <section v-else class="grid">
      <UiCard v-for="project in filtered" :key="project.id" :item="project" />
    </section>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 24px;
}

.filters__pill {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 11px 20px;
  border: 1px solid var(--dot);
  border-radius: var(--r-pill);
  background: transparent;
  color: var(--text-3);
  transition: background 0.25s, color 0.25s, border-color 0.25s;
}

.filters__pill:hover { border-color: var(--accent); color: var(--accent); }

.filters__pill--active {
  background: var(--accent-btn);
  border-color: var(--accent-btn);
  color: var(--on-accent);
}

.filters__count { opacity: 0.6; }

/* ── Сетка ── */
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
}

/* ── Состояния ── */
.loading { display: flex; gap: 8px; padding: 48px 0; }

.loading__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.2s ease infinite;
}

.loading__dot:nth-child(2) { animation-delay: 0.2s; }
.loading__dot:nth-child(3) { animation-delay: 0.4s; }

.empty {
  padding: 64px 0;
  font-size: 14px;
  color: var(--text-4);
  text-align: center;
}
</style>
