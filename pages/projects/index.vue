<script setup lang="ts">
import type { Post } from '~/types'

useSeoMeta({
  title: 'Проекты',
  description: 'Портфолио проектов — сайты, приложения, open-source.',
})

const { data: projects, pending } = await useFetch<Post[]>('/api/posts/project')

const activeTag = ref<string | null>(null)

const allTags = computed(() => {
  const set = new Set<string>()
  projects.value?.forEach((p) => p.tags.forEach((t) => set.add(t.name)))
  return Array.from(set).sort()
})

const filtered = computed(() => {
  if (!activeTag.value) return projects.value ?? []
  return (projects.value ?? []).filter((p) => p.tags.some((t) => t.name === activeTag.value))
})
</script>

<template>
  <div class="page projects-page">
    <div class="container">
      <header class="page-header">
        <p class="eyebrow">Проекты</p>
        <h1 class="page-title">Работы &amp; Эксперименты</h1>
        <p class="page-subtitle">Коммерческие проекты, пет-проекты и open-source</p>
      </header>

      <div v-if="allTags.length" class="projects-tags">
        <button
          class="projects-tag"
          :class="{ 'projects-tag--active': activeTag === null }"
          @click="activeTag = null"
        >Все</button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="projects-tag"
          :class="{ 'projects-tag--active': activeTag === tag }"
          @click="activeTag = activeTag === tag ? null : tag"
        >{{ tag }}</button>
      </div>

      <div v-if="pending" class="loading">
        <span class="loading__dot" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="!filtered.length" class="empty">Проектов не найдено</div>

      <div v-else class="projects-grid">
        <UiCard v-for="project in filtered" :key="project.id" :item="project" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 64px 0 96px; }
.page-header { margin-bottom: 48px; }
.eyebrow { margin-bottom: 20px; }

.page-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 300;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
}

.page-subtitle { font-size: 14px; color: var(--text-2); }

.projects-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border);
}

.projects-tag {
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 6px 14px;
  border: 1px solid var(--border-s);
  color: var(--text-3);
  transition: all 0.2s;
  cursor: pointer;
  background: transparent;
  font-family: var(--font-mono);
}

.projects-tag:hover { color: var(--text-2); border-color: var(--text-3); }
.projects-tag--active { color: var(--accent); border-color: var(--accent); background: var(--accent-dim); }

.projects-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border);
}

@media (max-width: 768px) { .projects-grid { grid-template-columns: 1fr; } }

.loading { display: flex; gap: 8px; padding: 48px 0; }
.loading__dot {
  width: 6px; height: 6px;
  background: var(--accent);
  border-radius: 50%;
  animation: loading-pulse 1.2s ease infinite;
}
.loading__dot:nth-child(2) { animation-delay: 0.2s; }
.loading__dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes loading-pulse {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

.empty { padding: 64px 0; font-size: 14px; color: var(--text-3); text-align: center; }
</style>
