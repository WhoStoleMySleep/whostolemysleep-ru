<script setup lang="ts">
import type { Post } from '~/types'

const props = defineProps<{ item: Post }>()
const { format } = useFormatDate()
const { t } = useLocale()
const { linkFor } = usePostLink()

const link = computed(() => linkFor(props.item))

/** Хост внешней ссылки — «github.com» вместо полного url. */
const host = computed(() => {
  if (!props.item.url) return ''
  try {
    return new URL(props.item.url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
})
</script>

<template>
  <NuxtLink
    :to="link.href"
    :target="link.isExternal ? '_blank' : undefined"
    :rel="link.isExternal ? 'noopener noreferrer' : undefined"
    class="card"
  >
    <div class="card__meta">
      <span class="card__tag">
        {{ item.tags[0]?.name ?? (item.type === 'blog' ? t('card.blog') : t('card.project')) }}
      </span>
      <span v-if="item.published_at" class="card__date">{{ format(item.published_at) }}</span>
    </div>

    <h2 class="card__title">{{ item.title }}</h2>
    <p class="card__desc">{{ item.excerpt }}</p>

    <span v-if="host" class="card__link">{{ host }} ↗</span>
  </NuxtLink>
</template>

<style scoped>
.card {
  flex: 1 1 300px;
  min-height: 210px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: clamp(20px, 2.4vw, 28px);
  background: var(--bg-1);
  transition: background 0.3s;
  animation: rise 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.card:hover { background: var(--bg-2); }

.card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-4);
}

.card__tag { color: var(--accent); }

.card__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(18px, 1.9vw, 23px);
  line-height: 1.18;
  letter-spacing: 0.01em;
  text-wrap: pretty;
}

.card__desc {
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-4);
  text-wrap: pretty;
}

.card__link {
  margin-top: auto;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-3);
}
</style>
