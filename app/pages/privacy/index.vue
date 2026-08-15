<script setup lang="ts">
const { t } = useLocale()
const localePath = useLocalePath()

useSeoMeta({
  title:       () => t('seo.privacy_title'),
  description: () => t('seo.privacy_desc'),
  robots: 'noindex',
})

const SECTIONS = [
  's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8',
] as const
</script>

<template>
  <div class="privacy">
    <UiPageHeader
      :eyebrow="t('privacy.eyebrow')"
      :title="t('privacy.title')"
      :subtitle="t('privacy.updated')"
    />

    <div class="body">
      <section v-for="s in SECTIONS" :key="s" class="block">
        <h2 class="block__title">{{ t(`privacy.${s}_title`) }}</h2>

        <template v-if="s === 's6'">
          <p class="block__text">{{ t('privacy.s6_intro') }}</p>
          <ul class="block__list">
            <li class="block__item">{{ t('privacy.s6_item1') }}</li>
            <li class="block__item">{{ t('privacy.s6_item2') }}</li>
            <li class="block__item">{{ t('privacy.s6_item3') }}</li>
          </ul>
          <p class="block__text">{{ t('privacy.s6_outro') }}</p>
        </template>

        <p v-else class="block__text">{{ t(`privacy.${s}_text`) }}</p>
      </section>
    </div>

    <NuxtLink :to="localePath('/contacts')" class="back">← {{ t('privacy.back') }}</NuxtLink>
  </div>
</template>

<style scoped>
.body {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: clamp(26px, 3vw, 40px);
  padding: clamp(20px, 2.6vw, 34px) 0 clamp(34px, 4vw, 56px);
  border-top: 1px dotted var(--dot);
}

.block__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(16px, 1.8vw, 20px);
  letter-spacing: 0.02em;
  color: var(--text);
  margin-bottom: 12px;
}

.block__text {
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text-3);
  text-wrap: pretty;
}

.block__list {
  margin: 12px 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block__item {
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text-3);
  list-style: disc;
  text-wrap: pretty;
}

.back {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-4);
  transition: color 0.2s;
}

.back:hover { color: var(--accent); }
</style>
