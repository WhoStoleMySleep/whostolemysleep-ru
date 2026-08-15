<script setup lang="ts">
const route = useRoute()
const search = useSearchStore()
const { isDark, toggle } = useTheme()
const { locale, setLocale, t } = useLocale()
const { data: siteSettings } = await useSettings()
const localePath = useLocalePath()
const nav = useNav()

const mobileOpen = ref(false)

watch(() => route.path, () => { mobileOpen.value = false })

function toggleLocale() {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}

function isActive(key: string) {
  const path = route.path.replace(/^\/(ru|en)/, '') || '/'
  return key === 'home' ? path === '/' : path.startsWith(`/${key}`)
}
</script>

<template>
  <header class="head">
    <div class="head__bar">
      <NuxtLink :to="localePath('/')" class="head__logo" aria-label="whostolemysleep">
        <span class="head__dots" aria-hidden="true">
          <span class="head__dot head__dot--on" />
          <span class="head__dot" />
          <span class="head__dot" />
          <span class="head__dot head__dot--on" />
        </span>
        <span class="head__name">whostolemysleep</span>
        <span class="head__name head__name--short">wms.</span>
      </NuxtLink>

      <!-- Порядок как в макете: Hire me → тема → язык → бургер.
           Поиск — функция сайта, которой в макете нет, поэтому он
           стоит перед этой группой и не разрывает её. -->
      <div class="head__actions">
        <button
          v-if="siteSettings?.show_search"
          class="head__btn head__btn--search"
          type="button"
          :aria-label="t('search.placeholder')"
          @click="search.open()"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>

        <NuxtLink :to="localePath('/contacts')" class="head__cta">
          {{ t('nav.hire') }}
        </NuxtLink>

        <button
          class="head__btn"
          type="button"
          :aria-label="isDark ? 'Light theme' : 'Dark theme'"
          @click="toggle()"
        >
          <Transition name="theme-icon" mode="out-in">
            <svg v-if="isDark" key="sun" width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 4.11l1.06-1.06M3.05 12.95l1.06-1.06"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
              />
            </svg>
            <svg v-else key="moon" width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6.002 6.002 0 1 0 7 7z"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              />
            </svg>
          </Transition>
        </button>

        <button
          class="head__btn head__btn--text"
          type="button"
          :title="locale === 'ru' ? 'Switch to English' : 'Переключить на русский'"
          @click="toggleLocale()"
        >
          {{ locale === 'ru' ? 'EN' : 'RU' }}
        </button>

        <button
          class="head__btn head__burger"
          type="button"
          :aria-expanded="mobileOpen"
          aria-label="Menu"
          @click="mobileOpen = !mobileOpen"
        >
          <span /><span />
        </button>
      </div>
    </div>

    <Transition name="mobile-nav">
      <nav v-if="mobileOpen" class="head__mobile" aria-label="Основная навигация">
        <button
          v-if="siteSettings?.show_search"
          class="head__mobile-search"
          type="button"
          @click="mobileOpen = false; search.open()"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          {{ t('search.placeholder') }}
        </button>

        <NuxtLink
          v-for="item in nav"
          :key="item.key"
          :to="item.to"
          class="head__mobile-link"
          :class="{ 'head__mobile-link--active': isActive(item.key) }"
        >
          <span class="head__mobile-num">{{ item.num }}</span>
          {{ item.label }}
        </NuxtLink>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.head { border-bottom: 1px solid var(--border); }

.head__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: clamp(18px, 2.4vw, 30px) clamp(18px, 3vw, 46px);
}

/* ── Логотип ── */
.head__logo { display: flex; align-items: center; gap: 12px; }

.head__dots {
  display: grid;
  grid-template-columns: 4px 4px;
  gap: 3px;
  flex-shrink: 0;
}

.head__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--dash);
}

.head__dot--on { background: var(--accent); }

.head__name {
  font-size: 15px;
  /* 500, а не 700: это было единственное место с моноширинным 700 на
     всём сайте, и ради одного слова тянулся отдельный файл на 21.6 КБ. */
  font-weight: 500;
  letter-spacing: 0.08em;
  transition: color 0.2s;
}

.head__logo:hover .head__name { color: var(--accent); }

/* ── Действия ── */
.head__actions { display: flex; align-items: center; gap: 10px; }

.head__cta {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  background: var(--accent-flat);
  color: var(--on-accent);
  border-radius: var(--r-pill);
  padding: 11px 22px;
  transition: transform 0.25s;
}

.head__cta:hover { transform: translateY(-2px); color: var(--on-accent); }

@media (max-width: 900px) {
  .head__cta { display: none; }
}

.head__btn {
  display: grid;
  place-content: center;
  width: 44px;
  height: 40px;
  color: var(--text);
  background: var(--soft);
  border: 1px solid var(--border-s);
  border-radius: var(--r-pill);
  transition: color 0.25s, border-color 0.25s;
}

.head__btn:hover { color: var(--accent); border-color: var(--accent); }

.head__btn--text { font-size: 11px; letter-spacing: 0.14em; }

/* Ниже 900px появляется бургер, и четыре кнопки рядом с логотипом
   перестают помещаться — бургер срезало краем панели. Поиск (его в
   макете нет вовсе, это функция сайта) уезжает в мобильное меню,
   в баре остаются тема, язык и бургер — как в макете. */
@media (max-width: 900px) {
  .head__btn--search { display: none; }
}

@media (max-width: 480px) {
  .head__bar { gap: 10px; }
  .head__actions { gap: 6px; }
  .head__btn { width: 38px; height: 36px; }
  .head__name { font-size: 13px; letter-spacing: 0.04em; }
}

/* На 320px полное имя уже не оставляет места кнопкам — бургер срезало
   краем панели. Подменяем коротким знаком. */
.head__name--short { display: none; }

@media (max-width: 360px) {
  .head__bar { padding-inline: 14px; }
  .head__name { display: none; }
  .head__name--short { display: inline; }
}

/* ── Бургер ── */
.head__burger {
  display: none;
  gap: 5px;
  border-radius: var(--r-s);
}

@media (max-width: 900px) {
  .head__burger { display: grid; }
}

.head__burger span {
  display: block;
  width: 16px;
  height: 1.5px;
  background: currentColor;
}

.head__burger span:last-child { background: var(--accent); }

/* ── Мобильное меню ── */
.head__mobile {
  padding: 8px clamp(18px, 3vw, 46px) 24px;
  border-top: 1px solid var(--border);
  animation: fade 0.3s both;
}

.head__mobile-search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 0;
  border-bottom: 1px dotted var(--dot);
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--text-3);
  text-align: left;
  transition: color 0.2s;
}

.head__mobile-search:hover { color: var(--accent); }

.head__mobile-link {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px dotted var(--dot);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(20px, 6vw, 26px);
  text-transform: uppercase;
  color: var(--text-4);
  transition: color 0.2s;
}

.head__mobile-link:hover,
.head__mobile-link--active { color: var(--accent); }

.head__mobile-num {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.2em;
  color: var(--accent);
}

.mobile-nav-enter-active,
.mobile-nav-leave-active { transition: opacity 0.25s ease; }
.mobile-nav-enter-from,
.mobile-nav-leave-to { opacity: 0; }

.theme-icon-enter-active,
.theme-icon-leave-active { transition: opacity 0.15s ease, transform 0.15s var(--ease-out); }
.theme-icon-enter-from   { opacity: 0; transform: rotate(-30deg) scale(0.7); }
.theme-icon-leave-to     { opacity: 0; transform: rotate(30deg) scale(0.7); }
</style>
