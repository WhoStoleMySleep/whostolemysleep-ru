<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t, locale } = useI18n()

const is404 = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: () => is404.value ? `${t('error.404_title')} — whostolemysleep` : `${t('error.500_title')} — whostolemysleep`,
})

const isVisible = ref(false)
onMounted(() => { requestAnimationFrame(() => { isVisible.value = true }) })

function goHome() {
  clearError({ redirect: `/${locale.value}` })
}
</script>

<template>
  <div class="error-page" :class="{ 'error-page--visible': isVisible }">
    <div class="error-page__bg-glow" aria-hidden="true" />

    <div class="container error-page__inner">
      <p class="eyebrow error-page__eyebrow">
        {{ is404 ? t('error.404_eyebrow') : t('error.500_eyebrow') }}
      </p>

      <div class="error-page__code">
        <span class="error-page__digit">{{ is404 ? '4' : '5' }}</span>
        <span class="error-page__digit error-page__digit--accent">0</span>
        <span class="error-page__digit">{{ is404 ? '4' : '0' }}</span>
      </div>

      <p class="error-page__desc">
        {{ is404 ? t('error.404_desc') : t('error.500_desc') }}
      </p>

      <button class="error-page__btn" @click="goHome">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M10 6H2M5 3L2 6L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ t('error.back') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: var(--bg);
}

.error-page__bg-glow {
  position: absolute;
  top: -20%;
  right: -10%;
  width: 60%;
  height: 80%;
  background: radial-gradient(ellipse at 70% 40%, var(--accent-glow) 0%, transparent 60%);
  pointer-events: none;
}

.error-page__inner {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-top: 80px;
  padding-bottom: 80px;
}

.error-page__eyebrow {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease 0.1s, transform 0.5s var(--ease-out) 0.1s;
}

.error-page--visible .error-page__eyebrow { opacity: 1; transform: none; }

.error-page__code {
  display: flex;
  gap: 0;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease 0.2s, transform 0.7s var(--ease-out) 0.2s;
}

.error-page--visible .error-page__code { opacity: 1; transform: none; }

.error-page__digit {
  font-family: var(--font-display);
  font-size: clamp(120px, 20vw, 240px);
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--text);
}

.error-page__digit--accent { font-style: italic; color: var(--accent); }

.error-page__desc {
  font-size: 14px;
  color: var(--text-2);
  max-width: 400px;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease 0.4s, transform 0.5s var(--ease-out) 0.4s;
}

.error-page--visible .error-page__desc { opacity: 1; transform: none; }

.error-page__btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-3);
  border: 1px solid var(--border);
  padding: 10px 18px;
  cursor: pointer;
  background: none;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease 0.55s, transform 0.5s var(--ease-out) 0.55s, color 0.2s, border-color 0.2s, background 0.2s;
  width: fit-content;
}

.error-page--visible .error-page__btn { opacity: 1; transform: none; }

.error-page__btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-dim);
}
</style>
