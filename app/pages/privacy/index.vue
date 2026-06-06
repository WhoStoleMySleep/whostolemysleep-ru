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
  <div class="page privacy-page">
    <div class="container">
      <header class="page-header">
        <p class="eyebrow">{{ t('privacy.eyebrow') }}</p>
        <h1 class="page-title">{{ t('privacy.title') }}</h1>
        <p class="page-updated">{{ t('privacy.updated') }}</p>
      </header>

      <div class="privacy-body">
        <section v-for="s in SECTIONS" :key="s" class="privacy-section">
          <h2 class="privacy-section__title">{{ t(`privacy.${s}_title`) }}</h2>
          <template v-if="s === 's6'">
            <p class="privacy-section__text">{{ t('privacy.s6_intro') }}</p>
            <ul class="privacy-section__list">
              <li class="privacy-section__item">{{ t('privacy.s6_item1') }}</li>
              <li class="privacy-section__item">{{ t('privacy.s6_item2') }}</li>
              <li class="privacy-section__item">{{ t('privacy.s6_item3') }}</li>
            </ul>
            <p class="privacy-section__text">{{ t('privacy.s6_outro') }}</p>
          </template>
          <p v-else class="privacy-section__text">{{ t(`privacy.${s}_text`) }}</p>
        </section>
      </div>

      <NuxtLink :to="localePath('/contacts')" class="privacy-back">
        ← {{ t('privacy.back') }}
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 64px 0 120px; }

.page-header { margin-bottom: 64px; }

.eyebrow { margin-bottom: 20px; }

.page-title {
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 16px;
}

.page-updated {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.08em;
  font-family: var(--font-mono);
}

.privacy-body {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin-bottom: 64px;
}

.privacy-section__title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--text);
  margin-bottom: 12px;
}

.privacy-section__text {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
}

.privacy-section__list {
  margin: 12px 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.privacy-section__item {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
  list-style: disc;
}

.privacy-back {
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--text-3);
  transition: color 0.2s;
}

.privacy-back:hover { color: var(--accent); }
</style>
