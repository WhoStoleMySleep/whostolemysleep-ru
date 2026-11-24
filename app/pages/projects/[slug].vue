<script setup lang="ts">
import type { Post } from '~/types'

const NOT_FOUND_STATUS = 404
const route = useRoute()
const slug = route.params.slug as string
const { t } = useLocale()
const localePath = useLocalePath()
const { data: project, error } = await useLocaleData<Post>(`/api/projects/${slug}`)

if (error.value && error.value.statusCode !== NOT_FOUND_STATUS) throw createError(error.value)
if (!project.value) throw createError({ statusCode: NOT_FOUND_STATUS, message: 'Project not found' })

const isPreview = computed(() => import.meta.dev && project.value?.slug === 'preview-personal-site')
const screenshots = computed(() => project.value?.images.slice(1) ?? [])

useSeoMeta({
  title: () => project.value?.title ?? t('projects.eyebrow'),
  description: () => project.value?.excerpt ?? '',
  ogType: 'website',
  ogTitle: () => project.value?.title ?? '',
  ogDescription: () => project.value?.excerpt ?? '',
  ogUrl: () => `${SITE_URL}${localePath(`/projects/${slug}`)}`,
  ogImage: () => project.value?.images[0]?.url ?? OG_IMAGE,
  twitterImage: () => project.value?.images[0]?.url ?? OG_IMAGE,
  robots: () => isPreview.value ? 'noindex, nofollow' : undefined,
})
</script>

<template>
  <article v-if="project" class="project">
    <NuxtLink :to="localePath('/projects')" class="project__back">← {{ t('project.back') }}</NuxtLink>
    <p v-if="isPreview" class="project__preview">{{ t('project.preview') }}</p>

    <header class="project__head">
      <p class="project__eyebrow">{{ t('project.eyebrow') }}</p>
      <h1 class="project__title">{{ project.title }}</h1>
      <p v-if="project.excerpt" class="project__intro">{{ project.excerpt }}</p>
      <div class="project__details">
        <ul v-if="project.tags.length" class="project__tags" :aria-label="t('project.stack')">
          <li v-for="tag in project.tags" :key="tag.id">{{ tag.name }}</li>
        </ul>
        <a
          v-if="project.url" :href="project.url" target="_blank" rel="noopener noreferrer"
          class="project__visit" data-metrika-goal="project_open"
        >{{ t('project.visit') }} ↗</a>
      </div>
    </header>

    <figure v-if="project.images[0]" class="project__screen project__screen--cover">
      <img :src="project.images[0].url" :alt="project.images[0].alt || project.title" fetchpriority="high">
      <figcaption v-if="project.images[0].alt">{{ project.images[0].alt }}</figcaption>
    </figure>

    <div v-if="project.text" class="project__story">
      <p class="project__label">{{ t('project.about') }}</p>
      <div class="project__body" v-html="project.text" />
    </div>

    <section v-if="screenshots.length" class="project__gallery" :aria-label="t('project.screens')">
      <h2 class="project__label">{{ t('project.screens') }}</h2>
      <figure v-for="image in screenshots" :key="image.id" class="project__screen">
        <img :src="image.url" :alt="image.alt || project.title" loading="lazy">
        <figcaption v-if="image.alt">{{ image.alt }}</figcaption>
      </figure>
    </section>

    <footer class="project__footer">
      <span>{{ t('project.more') }}</span>
      <NuxtLink :to="localePath('/projects')">{{ t('project.back') }} →</NuxtLink>
    </footer>
  </article>
</template>

<style scoped>
.project { max-width: 1040px; margin: 0 auto; }
.project__back, .project__eyebrow, .project__label {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.project__back { color: var(--text-3); }
.project__back:hover { color: var(--accent); }
.project__preview {
  margin-top: 24px;
  padding: 14px 18px;
  border: 1px dashed var(--border-s);
  border-radius: var(--r-s);
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-2);
}
.project__head { padding: clamp(36px, 6vw, 70px) 0 36px; }
.project__eyebrow { color: var(--accent); margin-bottom: 20px; }
.project__title {
  max-width: 900px;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(32px, 5.6vw, 66px);
  line-height: 1.06;
  letter-spacing: -0.025em;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.project__intro {
  max-width: 760px;
  margin-top: 24px;
  font-size: clamp(14px, 1.7vw, 17px);
  line-height: 1.8;
  color: var(--text-2);
  text-wrap: pretty;
}
.project__details { display: flex; flex-wrap: wrap; gap: 24px; align-items: center; margin-top: 28px; }
.project__tags { display: flex; flex-wrap: wrap; gap: 8px; }
.project__tags li {
  border: 1px solid var(--border-s);
  border-radius: var(--r-pill);
  padding: 6px 12px;
  font-size: 11px;
  color: var(--text-2);
}
.project__visit { color: var(--accent); font-size: 12px; padding: 10px 0; }
.project__visit:hover { text-decoration: underline; text-underline-offset: 4px; }
.project__screen { margin: 0; min-width: 0; }
.project__screen img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--bg-3);
}
.project__screen figcaption { margin-top: 12px; font-size: 11px; line-height: 1.7; color: var(--text-3); }
.project__story {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 40px;
  padding-top: clamp(40px, 7vw, 80px);
}
.project__label { color: var(--text-3); padding-top: 7px; }
.project__body { min-width: 0; font-size: 14px; line-height: 1.9; color: var(--text-2); overflow-wrap: anywhere; }
.project__body :deep(h2), .project__body :deep(h3) {
  margin: 42px 0 18px;
  font-family: var(--font-display);
  font-size: clamp(23px, 3vw, 32px);
  line-height: 1.2;
  color: var(--text-strong);
  text-wrap: balance;
}
.project__body :deep(:first-child) { margin-top: 0; }
.project__body :deep(p) { margin-bottom: 22px; }
.project__body :deep(ul), .project__body :deep(ol) { padding-left: 24px; margin-bottom: 22px; }
.project__body :deep(ul) { list-style: disc; }
.project__body :deep(ol) { list-style: decimal; }
.project__body :deep(li) { margin-bottom: 8px; }
.project__body :deep(a) { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
.project__body :deep(img) { max-width: 100%; height: auto; border-radius: var(--r-s); }
.project__body :deep(pre) { overflow-x: auto; padding: 20px; background: var(--bg-3); border-radius: var(--r-s); margin-bottom: 22px; }
.project__body :deep(code) { font-family: var(--font-mono); font-size: 0.9em; }
.project__body :deep(blockquote) { border-left: 2px solid var(--accent); padding-left: 20px; margin: 24px 0; }
.project__body :deep(table) { display: block; overflow-x: auto; max-width: 100%; }
.project__gallery { margin-top: 48px; display: grid; gap: 24px; }
.project__footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 64px;
  padding-top: 28px;
  border-top: 1px dotted var(--dot);
  font-size: 12px;
  color: var(--text-3);
}
.project__footer a { color: var(--accent); }
@media (max-width: 700px) {
  .project__story { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .project__details { align-items: flex-start; gap: 14px; }
  .project__head { padding-bottom: 28px; }
}
</style>
