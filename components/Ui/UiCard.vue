<script setup lang="ts">
import type { Post } from '~/types'

const props = defineProps<{ item: Post }>()
const { format } = useFormatDate()

const href = computed(() =>
  props.item.url ? props.item.url : `/blog/${props.item.slug}`
)
const isExternal = computed(() => !!props.item.url)
</script>

<template>
  <article class="card">
    <NuxtLink
      :to="href"
      :target="isExternal ? '_blank' : undefined"
      :rel="isExternal ? 'noopener noreferrer' : undefined"
      class="card__inner"
    >
      <div v-if="item.images[0]?.url" class="card__image-wrap">
        <img
          :src="item.images[0].url"
          :alt="item.images[0].alt ?? item.title"
          class="card__image"
          loading="lazy"
        />
        <div class="card__image-overlay" />
      </div>
      <div class="card__body">
        <div class="card__meta">
          <span class="card__type">{{ item.type === 'blog' ? 'Блог' : 'Проект' }}</span>
          <span class="card__date">{{ format(item.date) }}</span>
        </div>
        <h3 class="card__title">{{ item.title }}</h3>
        <p class="card__descr">{{ item.excerpt }}</p>
        <ul v-if="item.tags.length" class="card__tags">
          <li v-for="tag in item.tags.slice(0, 4)" :key="tag.id" class="card__tag">
            {{ tag.name }}
          </li>
        </ul>
      </div>
      <div v-if="isExternal" class="card__external">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </NuxtLink>
  </article>
</template>

<style scoped>
.card {
  border: 1px solid var(--border);
  background: var(--bg-1);
  transition: border-color 0.25s, background 0.25s;
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--accent);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.3s var(--ease-out);
}

.card:hover { border-color: var(--border-s); background: var(--bg-2); }
.card:hover::before { transform: scaleY(1); }

.card__inner {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card__image-wrap {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s var(--ease-out);
}

.card:hover .card__image { transform: scale(1.04); }

.card__image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, var(--bg-1) 100%);
}

.card__body {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
}

.card__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card__type {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
}

.card__date {
  font-size: 11px;
  color: var(--text-3);
}

.card__title {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.5vw, 22px);
  font-weight: 400;
  color: var(--text);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.card__descr {
  font-size: 12px;
  color: var(--text-2);
  line-height: 1.7;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.card__tag {
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border: 1px solid var(--border-s);
  color: var(--text-3);
  transition: color 0.2s, border-color 0.2s;
}

.card:hover .card__tag {
  color: var(--text-2);
  border-color: var(--border-s);
}

.card__external {
  position: absolute;
  top: 14px;
  right: 14px;
  color: var(--accent);
  padding: 7px;
  background: var(--accent-dim);
  border: 1px solid rgba(240, 192, 96, 0.25);
  transition: background 0.2s, border-color 0.2s;
}

.card:hover .card__external {
  background: rgba(240, 192, 96, 0.2);
  border-color: rgba(240, 192, 96, 0.4);
}
</style>
