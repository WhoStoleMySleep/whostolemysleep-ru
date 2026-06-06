<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t, locale } = useI18n()

const is404 = computed(() => props.error.statusCode === 404)
const digits = computed(() => is404.value ? ['4', '0', '4'] : ['5', '0', '0'])

useSeoMeta({
  title: () => `${props.error.statusCode} — whostolemysleep`,
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

    <span class="error-page__badge" aria-hidden="true">
      ERR_{{ error.statusCode }}
    </span>

    <div class="container error-page__inner">
      <p class="eyebrow error-page__eyebrow">
        {{ is404 ? t('error.404_eyebrow') : t('error.500_eyebrow') }}
      </p>

      <div class="error-page__number" aria-label="Error {{ error.statusCode }}">
        <span
          v-for="(d, i) in digits"
          :key="i"
          class="error-page__digit"
          :class="{ 'error-page__digit--outline': i === 1 }"
          :style="{ transitionDelay: `${0.15 + i * 0.1}s` }"
        >{{ d }}</span>
      </div>

      <div class="error-page__sep" />

      <p class="error-page__desc">
        {{ is404 ? t('error.404_desc') : t('error.500_desc') }}
      </p>

      <button class="error-page__btn" @click="goHome">
        <span class="error-page__btn-arrow">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M11 7H3M6 4L3 7L6 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
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
  bottom: -10%;
  right: -5%;
  width: 55%;
  height: 70%;
  background: radial-gradient(ellipse at 80% 80%, var(--accent-glow) 0%, transparent 65%);
  pointer-events: none;
}

.error-page__badge {
  position: fixed;
  top: 32px;
  right: 48px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--text-3);
  opacity: 0;
  transition: opacity 0.6s ease 0.8s;
}

@media (max-width: 640px) {
  .error-page__badge { right: 24px; }
}

.error-page--visible .error-page__badge { opacity: 1; }

.error-page__inner {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-top: 80px;
  padding-bottom: 80px;
}

.error-page__eyebrow {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.5s ease 0.05s, transform 0.5s var(--ease-out) 0.05s;
  margin-bottom: 24px;
}

.error-page--visible .error-page__eyebrow { opacity: 1; transform: none; }

.error-page__number {
  display: flex;
  align-items: baseline;
  line-height: 0.9;
  margin-bottom: 40px;
}

.error-page__digit {
  font-family: var(--font-display);
  font-size: clamp(140px, 22vw, 280px);
  font-weight: 300;
  letter-spacing: -0.04em;
  color: var(--text);
  display: block;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s var(--ease-out), transform 0.8s var(--ease-out);
}

.error-page__digit--outline {
  font-style: italic;
  -webkit-text-stroke: 1.5px var(--accent);
  color: transparent;
}

.error-page--visible .error-page__digit { opacity: 1; transform: none; }

.error-page--visible .error-page__digit--outline {
  animation: neon-die 5s ease 1.5s forwards;
}

@keyframes neon-die {
  /* alive — solid fill, hot glow */
  0%   { color: var(--accent); filter: drop-shadow(0 0 12px var(--accent)) drop-shadow(0 0 28px var(--accent)); opacity: 1; }
  8%   { color: var(--accent); filter: drop-shadow(0 0 7px var(--accent)); }
  /* flicker 1 — quick blink */
  18%  { color: var(--accent); opacity: 1; filter: drop-shadow(0 0 9px var(--accent)); }
  19%  { opacity: 0.05; filter: none; }
  20%  { color: var(--accent); opacity: 1; filter: drop-shadow(0 0 16px var(--accent)); }
  /* flicker 2 — double tap */
  32%  { color: var(--accent); opacity: 1; filter: drop-shadow(0 0 7px var(--accent)); }
  33%  { opacity: 0.1; filter: none; }
  34%  { color: var(--accent); opacity: 1; filter: drop-shadow(0 0 11px var(--accent)); }
  35%  { opacity: 0.2; }
  36%  { color: var(--accent); opacity: 1; filter: drop-shadow(0 0 8px var(--accent)); }
  /* calm, dimming */
  50%  { color: var(--accent); filter: drop-shadow(0 0 5px var(--accent)); opacity: 1; }
  /* flicker 3 — long stutter */
  58%  { color: var(--accent); opacity: 1; }
  59%  { opacity: 0.12; filter: none; }
  60%  { color: var(--accent); opacity: 0.5; filter: drop-shadow(0 0 4px var(--accent)); }
  61%  { opacity: 0.08; }
  62%  { color: var(--accent); opacity: 1; filter: drop-shadow(0 0 6px var(--accent)); }
  /* death flash — solid and blazing, then SNAP to hollow */
  70%  { color: var(--accent); filter: drop-shadow(0 0 22px var(--accent)) drop-shadow(0 0 44px var(--accent)); opacity: 1; }
  72%  { opacity: 0.03; filter: none; }
  /* hollow from here — burned out, only outline shell remains */
  73%  { color: transparent; opacity: 1; filter: drop-shadow(0 0 20px var(--accent)); }
  82%  { opacity: 0.35; filter: drop-shadow(0 0 2px var(--accent)); }
  88%  { opacity: 1; filter: drop-shadow(0 0 2px var(--accent)); }
  94%  { opacity: 0.65; filter: none; }
  /* dead — hollow, barely twitching */
  100% { color: transparent; opacity: 1; filter: drop-shadow(0 0 1px var(--accent)); }
}

.error-page__sep {
  width: 100%;
  height: 1px;
  background: var(--border);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.7s var(--ease-out) 0.5s;
  margin-bottom: 32px;
}

.error-page--visible .error-page__sep { transform: scaleX(1); }

.error-page__desc {
  font-size: 13px;
  color: var(--text-2);
  max-width: 380px;
  margin-bottom: 40px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.5s ease 0.6s, transform 0.5s var(--ease-out) 0.6s;
}

.error-page--visible .error-page__desc { opacity: 1; transform: none; }

.error-page__btn {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  border: 1px solid var(--border);
  padding: 12px 20px;
  cursor: pointer;
  background: none;
  width: fit-content;
  opacity: 0;
  transform: translateY(10px);
  transition:
    opacity 0.5s ease 0.7s,
    transform 0.5s var(--ease-out) 0.7s,
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.error-page--visible .error-page__btn { opacity: 1; transform: none; }

.error-page__btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-dim);
}

.error-page__btn-arrow {
  display: flex;
  align-items: center;
  transition: transform 0.3s var(--ease-out);
}

.error-page__btn:hover .error-page__btn-arrow { transform: translateX(-3px); }
</style>
