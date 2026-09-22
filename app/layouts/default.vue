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
 * The display font differs per locale (Archivo for latin, Onest for cyrillic), so
 * only the one the page actually needs is preloaded. The base JetBrains Mono latin
 * is preloaded in nuxt.config.
 */
useHead(() => ({
  // lang is not only about accessibility: --hero-size in main.css keys off it and
  // drops the type size for cyrillic.
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

/**
 * The feed of the language being read: someone subscribing from the Russian site
 * should not start receiving English. Its own call rather than another entry in the
 * list above, which is typed as font preloads and nothing else.
 */
useHead(() => ({
  link: [
    { rel: 'alternate', type: 'application/rss+xml', title: 'Blog', href: `/${locale.value}/rss.xml` },
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

        <nav class="rail__nav" :aria-label="$t('nav.aria')">
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
        <span class="sr-only">{{ $t('nav.toTop') }}</span>
      </button>
    </Transition>

    <AppSearch />
  </div>
</template>

<style scoped>
.shell {
  --shell-pad: clamp(10px, 2.2vw, 30px);
  /* Panel height = viewport minus the shell's padding. The rail gets the same
     value: left at 100vh it would, as a flex item, stretch the panel to a full
     screen, the padding would be added on top and the page would grow taller than
     the viewport — visible on short pages as a clipped panel bottom. */
  --panel-h: calc(100dvh - var(--shell-pad) * 2);
  /* The rail sits inside the panel, whose inner area is 2px shorter because of the
     top and bottom border. Without subtracting them it does not fit and stretches
     the panel those same 2px past the edge of the screen. */
  --rail-h:  calc(var(--panel-h) - 2px);

  padding: var(--shell-pad);
}

/* ── Progress bar ── */
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

/* ── Background behind the panel ── */
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

/* ── Panel ──
   overflow: clip, as in the mockup. It clips the hero circle along the rounded
   corner and, as a side effect, disables sticky on .rail — the rail scrolls with
   the page, exactly as designed. */
.panel {
  position: relative;
  z-index: 10;
  overflow: clip;
  max-width: 1420px;
  margin: 0 auto;
  min-height: var(--panel-h);
  display: flex;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--r-panel);
  box-shadow: var(--shadow);
}

/* ── Side rail ── */
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
  top: var(--shell-pad);
  align-self: flex-start;
  height: var(--rail-h);
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

/* ── Right column ── */
.col {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.col__main {
  /* The column's padding is declared as variables: sections that need to reach the
     edge of the panel (the hero on the home page) cancel it with a negative margin
     instead of repeating the values. */
  --main-pad-x: clamp(18px, 3vw, 56px);
  --main-pad-t: clamp(24px, 3.6vw, 60px);

  flex: 1 1 auto;
  padding: var(--main-pad-t) var(--main-pad-x) clamp(28px, 3vw, 44px);
}

/* A safety net: the frame is set by the panel, so any .container inside it has its
   own padding and max-width zeroed — otherwise the spacing doubles. No page uses
   .container any more; it survives only in app/error.vue, which renders outside the
   layout and is not touched by this rule. */
.col__main :deep(.container) {
  max-width: 100%;
  padding-inline: 0;
}

/* ── Back-to-top button ── */
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
