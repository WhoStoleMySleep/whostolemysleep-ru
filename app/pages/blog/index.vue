<script setup lang="ts">
import type { Post } from '~/types'

const { locale, t, postCount } = useLocale()
const { format } = useFormatDate()
const { linkFor } = usePostLink()

useSeoMeta({
  title:       () => t('seo.blog_title'),
  description: () => t('seo.blog_desc'),
})

const { data: posts, pending } = await useAsyncData(
  () => `posts-blog-${locale.value}`,
  () => $fetch<Post[]>('/api/posts/blog', { query: { locale: locale.value } }),
  { lazy: true },
)

const localQuery = ref('')

const filtered = computed(() => {
  const list = posts.value ?? []
  const q = localQuery.value.trim().toLowerCase()
  const matched = !q
    ? list
    : list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some(tag => tag.name.toLowerCase().includes(q)),
      )
  return matched.map(post => ({ ...post, ...linkFor(post) }))
})
</script>

<template>
  <div class="blog-page">
    <UiPageHeader
      :eyebrow="t('blog.eyebrow')"
      num="01"
      :title="t('blog.title')"
      :subtitle="t('blog.subtitle')"
    />

    <div class="filter">
      <input
        v-model="localQuery"
        class="filter__input"
        type="search"
        :placeholder="t('blog.filter')"
      >
      <span class="filter__count">{{ postCount(filtered.length) }}</span>
    </div>

    <div v-if="pending" class="loading" aria-live="polite">
      <span v-for="i in 3" :key="i" class="loading__dot" />
    </div>

    <p v-else-if="!filtered.length" class="empty">{{ t('blog.empty') }}</p>

    <div v-else class="rows">
      <NuxtLink
        v-for="post in filtered"
        :key="post.id"
        :to="post.href"
        :target="post.isExternal ? '_blank' : undefined"
        :rel="post.isExternal ? 'noopener noreferrer' : undefined"
        class="row"
      >
        <div class="row__head">
          <span class="row__meta">
            <template v-if="post.tags[0]">{{ post.tags[0].name }} · </template>
            {{ t('card.blog') }}
            <template v-if="post.published_at"> · {{ format(post.published_at) }}</template>
          </span>
          <span class="row__title">{{ post.title }}</span>
        </div>
        <span class="row__desc">{{ post.excerpt }}</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 20px;
  padding-bottom: 24px;
}

.filter__input {
  flex: 1 1 260px;
  max-width: 360px;
  background: var(--bg-3);
  border: 1px solid var(--border-s);
  border-radius: var(--r-s);
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  outline: none;
  transition: border-color 0.25s;
}

.filter__input:focus { border-color: var(--accent); }

.filter__count {
  font-size: 10.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-4);
  white-space: nowrap;
}

/* ── Список ── */
.rows { border-top: 1px dotted var(--dot); }

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  padding: clamp(20px, 2.6vw, 34px) clamp(4px, 1.2vw, 14px);
  border-bottom: 1px dotted var(--dot);
  transition: background 0.3s;
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both;
}

.row:hover { background: var(--accent-dim); }

.row__head {
  flex: 1 1 min(100%, 300px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.row__meta {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}

.row__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(22px, 2.8vw, 34px);
  line-height: 1.12;
  letter-spacing: 0.01em;
  text-wrap: pretty;
}

.row__desc {
  flex: 1 1 min(100%, 260px);
  min-width: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-4);
  text-wrap: pretty;
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
