<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t, locale } = useI18n()

const is404 = computed(() => props.error.statusCode === 404)
const digits = computed(() => (is404.value ? ['4', '0', '4'] : ['5', '0', '0']))

useSeoMeta({
  title: () => `${props.error.statusCode} — whostolemysleep`,
})

function goHome() {
  clearError({ redirect: `/${locale.value}` })
}
</script>

<template>
  <div class="err">
    <div class="err__bg err__bg--diagonal" aria-hidden="true" />
    <div class="err__bg err__bg--dots" aria-hidden="true" />

    <span class="err__badge" aria-hidden="true">ERR_{{ error.statusCode }}</span>

    <div class="err__panel">
      <p class="err__eyebrow">
        {{ is404 ? t('error.404_eyebrow') : t('error.500_eyebrow') }}
      </p>

      <p class="err__number">
        <span
          v-for="(d, i) in digits"
          :key="i"
          class="err__digit"
          :class="{ 'err__digit--accent': i === 1 }"
          :style="{ animationDelay: `${0.08 + i * 0.07}s` }"
        >{{ d }}</span>
      </p>

      <span class="err__rule" aria-hidden="true" />

      <p class="err__desc">
        {{ is404 ? t('error.404_desc') : t('error.500_desc') }}
      </p>

      <button class="err__btn" type="button" @click="goHome()">
        {{ t('error.back') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Страница ошибки рендерится вне лейаута, поэтому фоновые слои и
   панель продублированы здесь — иначе она выпадает из общего вида.
   Панель обязательна: без неё контент ложится прямо на оранжевую
   диагональ и акцентный текст на ней становится невидимым. */
.err {
  --shell-pad: clamp(10px, 2.2vw, 30px);

  position: relative;
  min-height: 100dvh;
  padding: var(--shell-pad);
  background: var(--bg);
}

.err__panel {
  position: relative;
  z-index: 10;
  max-width: 1420px;
  margin: 0 auto;
  min-height: calc(100dvh - var(--shell-pad) * 2);
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: clip;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--r-panel);
  box-shadow: var(--shadow);
  padding: clamp(32px, 6vw, 96px);
}

.err__bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.err__bg--diagonal { background: linear-gradient(105deg, var(--accent-flat) 0 38%, var(--bg) 38% 100%); }

.err__bg--dots {
  opacity: 0.5;
  background-image: radial-gradient(var(--border-s) 1px, transparent 1px);
  background-size: 26px 26px;
}

.err__badge {
  position: fixed;
  top: 28px;
  right: clamp(24px, 3vw, 48px);
  z-index: 10;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--text-4);
  animation: fade 0.6s ease 0.6s both;
}

.err__eyebrow {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent);
  animation: rise 0.6s var(--ease-out) both;
}

/* ── Число ──
   Только Archivo 900 без курсива: курсивного начертания в проекте нет,
   и браузер подделывал наклон скосом — цифра выходила кривой и лезла
   на соседнюю. Трекинг положительный, как во всех заголовках сайта. */
.err__number {
  display: flex;
  align-items: baseline;
  margin: clamp(16px, 2.5vw, 28px) 0 0;
  line-height: 0.9;
}

.err__digit {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(120px, 21vw, 260px);
  letter-spacing: 0.02em;
  color: var(--text);
  text-shadow: var(--display-shadow);
  animation: rise 0.7s var(--ease-out) both;
}

.err__digit--accent { color: var(--accent-flat); }

.err__rule {
  display: block;
  height: 1px;
  margin: clamp(28px, 4vw, 48px) 0 0;
  background: repeating-linear-gradient(90deg, var(--dash) 0 3px, transparent 3px 8px);
  animation: fade 0.6s ease 0.35s both;
}

.err__desc {
  max-width: 420px;
  margin: clamp(22px, 3vw, 32px) 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-2);
  text-wrap: pretty;
  animation: rise 0.6s var(--ease-out) 0.4s both;
}

.err__btn {
  /* панель — флекс-колонка, без этого кнопка растягивается на всю ширину */
  align-self: flex-start;
  margin: clamp(26px, 3vw, 36px) 0 0;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: var(--accent-flat);
  color: var(--on-accent);
  border-radius: var(--r-pill);
  padding: 15px 28px;
  transition: transform 0.25s;
  animation: rise 0.6s var(--ease-out) 0.48s both;
}

.err__btn:hover { transform: translateY(-2px); }
</style>
