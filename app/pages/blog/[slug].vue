<script setup lang="ts">
import type { Post } from '~/types'

const route  = useRoute()
const slug   = route.params.slug as string
const { locale, t } = useLocale()
const localePath = useLocalePath()

const { data: post, error } = await useAsyncData(
  () => `blog-${slug}-${locale.value}`,
  () => $fetch<Post>(`/api/blog/${slug}`, { query: { locale: locale.value } }),
)

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
  <article v-if="post" class="post">
    <NuxtLink :to="localePath('/blog')" class="post__back">← {{ t('post.back') }}</NuxtLink>

    <header class="post__head">
      <p class="post__meta">
        <span v-if="post.published_at">{{ formatLong(post.published_at) }}</span>
        <template v-if="post.published_at && post.tags[0]"> · </template>
        <span v-if="post.tags[0]">{{ post.tags[0].name }}</span>
      </p>

      <h1 class="post__title">{{ post.title }}</h1>

      <ul v-if="post.tags.length > 1" class="post__tags">
        <li v-for="tag in post.tags" :key="tag.id" class="post__tag">{{ tag.name }}</li>
      </ul>
    </header>

    <img
      v-if="post.images[0]?.url"
      :src="post.images[0].url"
      :alt="post.images[0].alt ?? post.title"
      class="post__cover"
    >

    <div class="post__body" v-html="post.text" />

    <p v-if="post.url" class="post__source">
      <a :href="post.url" target="_blank" rel="noopener noreferrer" class="post__source-link">
        {{ t('post.source') }} ↗
      </a>
    </p>
  </article>
</template>

<style scoped>
.post {
  max-width: 720px;
  margin: 0 auto;
}

.post__back {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-3);
  transition: color 0.2s;
}

.post__back:hover { color: var(--accent); }

.post__head {
  padding: clamp(22px, 3vw, 38px) 0 0;
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.post__meta {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--accent);
}

.post__title {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(28px, 4.4vw, 54px);
  line-height: 1.04;
  letter-spacing: 0.01em;
  text-wrap: balance;
  margin: 18px 0 0;
}

.post__tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }

.post__tag {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--text-3);
  border: 1px solid var(--border-s);
  border-radius: var(--r-pill);
  padding: 6px 13px;
}

.post__cover {
  width: 100%;
  height: clamp(180px, 26vw, 300px);
  object-fit: cover;
  margin: clamp(26px, 3vw, 42px) 0;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--bg-3);
  animation: fade 0.9s 0.1s both;
}

/* ── Тело статьи ── */
.post__body {
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--text-2);
  text-wrap: pretty;
}

.post__body :deep(h2),
.post__body :deep(h3) {
  font-family: var(--font-display);
  font-weight: 800;
  color: var(--text-strong);
  letter-spacing: 0.01em;
  margin: 38px 0 14px;
}

.post__body :deep(h2) { font-size: clamp(21px, 2.6vw, 30px); }
.post__body :deep(h3) { font-size: clamp(19px, 2.2vw, 26px); }
.post__body :deep(p)  { margin-bottom: 22px; }

.post__body :deep(a) {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: opacity 0.2s;
}

.post__body :deep(a:hover) { opacity: 0.75; }

.post__body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
}

.post__body :deep(pre) {
  background: var(--bg-3);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  padding: 22px;
  overflow-x: auto;
  margin: 30px 0;
}

.post__body :deep(pre code) { background: none; border: none; padding: 0; font-size: 13px; }

.post__body :deep(ul),
.post__body :deep(ol) { padding-left: 24px; margin-bottom: 22px; }
.post__body :deep(ul) { list-style: disc; }
.post__body :deep(ol) { list-style: decimal; }
.post__body :deep(li) { margin-bottom: 6px; }

.post__body :deep(blockquote) {
  margin: 30px 0;
  padding: 4px 0 4px 22px;
  border-left: 2px solid var(--accent);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(17px, 1.9vw, 23px);
  line-height: 1.4;
  color: var(--text);
}

.post__body :deep(img) {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--r);
  margin: 26px 0;
}

.post__source {
  margin-top: 56px;
  padding-top: 28px;
  border-top: 1px dotted var(--dot);
}

.post__source-link {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}
</style>
