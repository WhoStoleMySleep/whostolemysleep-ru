<script setup lang="ts">
import type { Post } from '~/types'

const route  = useRoute()
const slug   = route.params.slug as string
const { locale, t } = useLocale()

const { data: post, error } = await useFetch<Post>(`/api/blog/${slug}`, {
  query: { locale },
})

if (error.value || !post.value) {
  throw createError({ statusCode: 404, message: 'Post not found' })
}

useSeoMeta({
  title:       () => post.value?.title ?? t('blog.eyebrow'),
  description: () => post.value?.excerpt ?? '',
})

const { formatLong } = useFormatDate()
</script>

<template>
  <div v-if="post" class="page post-page">
    <div class="container post-container">

      <header class="post-header">
        <NuxtLink to="/blog" class="post-back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 7H4M6 4L3 7L6 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ t('post.back') }}
        </NuxtLink>

        <div class="post-meta">
          <span v-if="post.published_at" class="post-date">{{ formatLong(post.published_at) }}</span>
        </div>

        <h1 class="post-title">{{ post.title }}</h1>

        <ul v-if="post.tags.length" class="post-tags">
          <li v-for="tag in post.tags" :key="tag.id" class="post-tag">{{ tag.name }}</li>
        </ul>
      </header>

      <div v-if="post.images[0]?.url" class="post-cover">
        <img :src="post.images[0].url" :alt="post.images[0].alt ?? post.title" />
      </div>

      <div class="post-body" v-html="post.text" />

      <div v-if="post.url" class="post-external">
        <a :href="post.url" target="_blank" rel="noopener noreferrer" class="post-external__link">
          {{ t('post.source') }}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>

    </div>
  </div>
</template>

<style scoped>
.post-page { padding: 64px 0 120px; }
.post-container { max-width: 760px; }

.post-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.05em;
  margin-bottom: 48px;
  transition: color 0.2s;
}
.post-back:hover { color: var(--accent); }

.post-header { margin-bottom: 48px; }

.post-meta { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.post-date { font-size: 12px; color: var(--text-3); }

.post-title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 24px;
}

.post-tags { display: flex; flex-wrap: wrap; gap: 8px; }

.post-tag {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 4px 10px;
  border: 1px solid var(--border-s);
  color: var(--text-3);
}

.post-cover { margin-bottom: 48px; border: 1px solid var(--border); }
.post-cover img { width: 100%; aspect-ratio: 16/9; object-fit: cover; }

.post-body { font-size: 15px; line-height: 1.8; color: var(--text-2); }

.post-body :deep(h2),
.post-body :deep(h3) {
  font-family: var(--font-display);
  font-weight: 400;
  color: var(--text);
  margin: 40px 0 16px;
  letter-spacing: -0.02em;
}

.post-body :deep(h2) { font-size: clamp(22px, 3vw, 32px); }
.post-body :deep(h3) { font-size: clamp(18px, 2.5vw, 24px); }
.post-body :deep(p)  { margin-bottom: 20px; }

.post-body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: opacity 0.2s;
}
.post-body :deep(a:hover) { opacity: 0.75; }

.post-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--bg-2);
  padding: 2px 6px;
  border: 1px solid var(--border);
}

.post-body :deep(pre) {
  background: var(--bg-1);
  border: 1px solid var(--border);
  padding: 24px;
  overflow-x: auto;
  margin: 32px 0;
}

.post-body :deep(pre code) { background: none; border: none; padding: 0; font-size: 13px; }

.post-body :deep(ul),
.post-body :deep(ol) { padding-left: 24px; margin-bottom: 20px; }
.post-body :deep(ul) { list-style: disc; }
.post-body :deep(ol) { list-style: decimal; }
.post-body :deep(li) { margin-bottom: 6px; }

.post-body :deep(blockquote) {
  border-left: 2px solid var(--accent);
  padding-left: 20px;
  margin: 32px 0;
  font-style: italic;
  color: var(--text-2);
}

.post-external {
  margin-top: 64px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

.post-external__link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--accent);
  transition: gap 0.2s;
}

.post-external__link:hover { gap: 12px; }
</style>
