<script setup lang="ts">
const route = useRoute()
const { locale } = useLocale()
const localePath = useLocalePath()
const nav = useNav()
const { progress, toTop } = useScrollProgress()

const progressPct = computed(() => `${Math.round(progress.value * 100)}%`)
const showToTop = computed(() => progress.value > 0.02)

function isActive(key: string) {
  const path = route.path.replace(/^\/(ru|en)/, '') || '/'
  return key === 'home' ? path === '/' : path.startsWith(`/${key}`)
}

/**
 * Дисплейный шрифт разный по локали (Archivo на латиницу, Onest на
 * кириллицу), поэтому предзагружаем только тот, что реально нужен
 * странице. Базовый JetBrains Mono latin предзагружен в nuxt.config.
 */
useHead(() => ({
  // lang нужен не только для доступности: на него завязан --hero-size
  // в main.css, который сбавляет кегль для кириллицы.
  htmlAttrs: { lang: locale.value },
  link: locale.value === 'ru'
    ? [
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/onest-900-normal-cyrillic.woff2' },
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/jetbrains-mono-400-normal-cyrillic.woff2' },
      ]
    : [
        { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
          href: '/fonts/archivo-900-normal-latin.woff2' },
      ],
}))
</script>

<template>
  <div class="shell">
    <div class="progress" aria-hidden="true">
      <div class="progress__bar" :style="{ width: progressPct }" />
    </div>

    <div class="bg bg--diagonal" aria-hidden="true" />
    <div class="bg bg--dots" aria-hidden="true" />

    <div class="panel">
      <aside class="rail">
        <NuxtLink :to="localePath('/')" class="rail__mark" aria-label="whostolemysleep">
          W<span class="rail__dot">.</span>
        </NuxtLink>

        <nav class="rail__nav" aria-label="Основная навигация">
          <NuxtLink
            v-for="item in nav"
            :key="item.key"
            :to="item.to"
            class="rail__link"
            :class="{ 'rail__link--active': isActive(item.key) }"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <span class="rail__tick" aria-hidden="true" />
      </aside>

      <div class="col">
        <AppHeader />
        <main class="col__main">
          <slot />
        </main>
        <AppFooter />
      </div>
    </div>

    <Transition name="totop">
      <button v-show="showToTop" class="totop" type="button" @click="toTop()">
        <span class="totop__pct">{{ progressPct }}</span>
        <span class="totop__btn" aria-hidden="true">↑</span>
        <span class="sr-only">Наверх</span>
      </button>
    </Transition>

    <AppSearch />
  </div>
</template>

<style scoped>
.shell {
  --shell-pad: clamp(10px, 2.2vw, 30px);
  padding: var(--shell-pad);
}

/* ── Полоса прогресса ── */
.progress {
  position: fixed;
  inset: 0 0 auto;
  height: 2px;
  z-index: 60;
  background: var(--soft);
}

.progress__bar {
  height: 100%;
  background: var(--accent-flat);
  transition: width 0.12s linear;
}

/* ── Фон под панелью ── */
.bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.bg--diagonal { background: linear-gradient(105deg, var(--accent-flat) 0 38%, var(--bg) 38% 100%); }

.bg--dots {
  opacity: 0.5;
  background-image: radial-gradient(var(--border-s) 1px, transparent 1px);
  background-size: 26px 26px;
}

/* ── Панель ──
   overflow: clip как в макете. Он обрезает круг героя по скруглённому
   углу и заодно делает sticky у .rail неактивным — рейл едет вместе
   со страницей, ровно как в дизайне. */
.panel {
  position: relative;
  z-index: 10;
  overflow: clip;
  max-width: 1420px;
  margin: 0 auto;
  min-height: calc(100vh - var(--shell-pad) * 2);
  display: flex;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--r-panel);
  box-shadow: var(--shadow);
}

/* ── Боковой рейл ── */
.rail {
  flex: 0 0 78px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 0;
  border-right: 1px solid var(--border);
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  max-height: 100vh;
}

@media (max-width: 900px) {
  .rail { display: none; }
}

.rail__mark {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 0.04em;
}

.rail__dot { color: var(--accent); }

.rail__nav {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 30px;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.rail__link {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--text-4);
  transition: color 0.3s;
}

.rail__link:hover { color: var(--accent); }
.rail__link--active { color: var(--accent); }

.rail__tick {
  width: 1px;
  height: 46px;
  background: linear-gradient(var(--accent), transparent);
}

/* ── Правая колонка ── */
.col {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.col__main {
  /* Отступы колонки объявлены переменными: секции, которым нужно
     выйти в край панели (герой на главной), отменяют их через
     отрицательный margin, не дублируя сами значения. */
  --main-pad-x: clamp(18px, 3vw, 56px);
  --main-pad-t: clamp(24px, 3.6vw, 60px);

  flex: 1 1 auto;
  padding: var(--main-pad-t) var(--main-pad-x) clamp(28px, 3vw, 44px);
}

/* Страховка: раму задаёт панель, поэтому у любого .container внутри
   неё гасятся собственные поля и max-width — иначе отступы удвоятся.
   Сейчас страницы .container не используют, он остался только в
   app/error.vue, а тот рендерится вне лейаута и правила не касается. */
.col__main :deep(.container) {
  max-width: 100%;
  padding-inline: 0;
}

/* ── Кнопка «наверх» ── */
.totop {
  position: fixed;
  right: clamp(10px, 1.8vw, 22px);
  bottom: clamp(18px, 3vw, 40px);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  padding: 0;
}

.totop__pct {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--text-3);
}

.totop__btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-content: center;
  border-radius: 50%;
  border: 1px solid var(--border-s);
  background: var(--bg-1);
  color: var(--accent);
  font-size: 13px;
  transition: border-color 0.25s, transform 0.25s;
}

.totop:hover .totop__btn {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.totop-enter-active,
.totop-leave-active { transition: opacity 0.35s ease; }
.totop-enter-from,
.totop-leave-to { opacity: 0; }

.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
