<script setup lang="ts">
import type { Post } from '~/types'

const { locale, t, postCount } = useLocale()

useSeoMeta({
  title:       () => t('seo.blog_title'),
  description: () => t('seo.blog_desc'),
})

const { data: posts, pending } = await useAsyncData(
  () => `posts-blog-${locale.value}`,
  () => $fetch<Post[]>('/api/posts/blog', { query: { locale: locale.value } }),
)

const localQuery = ref('')
const filtered = computed(() => {
  if (!localQuery.value.trim()) return posts.value ?? []
  const q = localQuery.value.toLowerCase()
  return (posts.value ?? []).filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.some((tag) => tag.name.toLowerCase().includes(q)),
  )
})
</script>

<template>
  <div class="page blog-page">
    <div class="container">
      <header class="page-header">
        <p class="eyebrow">{{ t('blog.eyebrow') }}</p>
        <h1 class="page-title">{{ t('blog.title') }}</h1>
        <p class="page-subtitle">{{ t('blog.subtitle') }}</p>
      </header>

      <div class="blog-filter">
        <input
          v-model="localQuery"
          class="blog-filter__input"
          :placeholder="t('blog.filter')"
          type="search"
        />
        <span class="blog-filter__count">{{ postCount(filtered.length) }}</span>
      </div>

      <div v-if="pending" class="loading">
        <span class="loading__dot" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="filtered.length === 0" class="empty">{{ t('blog.empty') }}</div>

      <div v-else class="blog-grid">
        <UiCard v-for="post in filtered" :key="post.id" :item="post" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 64px 0 96px; }
.page-header { margin-bottom: 56px; }
.eyebrow { margin-bottom: 20px; }

.page-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 300;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
}

.page-subtitle { font-size: 14px; color: var(--text-2); max-width: 480px; }

.blog-filter {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 48px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.blog-filter__input {
  flex: 1;
  max-width: 360px;
  background: var(--bg-1);
  border: 1px solid var(--border);
  padding: 10px 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.blog-filter__input::placeholder { color: var(--text-3); }
.blog-filter__input:focus { border-color: var(--accent); }

.blog-filter__count { font-size: 11px; color: var(--text-3); letter-spacing: 0.05em; white-space: nowrap; }

.blog-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
}

@media (max-width: 1024px) { .blog-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .blog-grid { grid-template-columns: 1fr; } }

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
  50%       { opacity: 1;   transform: scale(1); }
}

.empty { padding: 64px 0; font-size: 14px; color: var(--text-3); text-align: center; }
</style>
