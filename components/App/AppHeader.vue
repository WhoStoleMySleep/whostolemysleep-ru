<script setup lang="ts">
const route = useRoute()
const search = useSearchStore()
const { isDark, toggle } = useTheme()
const scrolled = ref(false)
const mobileOpen = ref(false)

const nav = [
  { label: 'Блог',     to: '/blog' },
  { label: 'Проекты',  to: '/projects' },
  { label: 'Резюме',   to: '/resume' },
  { label: 'Контакты', to: '/contacts' },
]

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 40 }
  window.addEventListener('scroll', onScroll, { passive: true })
  onUnmounted(() => window.removeEventListener('scroll', onScroll))
})

watch(() => route.path, () => { mobileOpen.value = false })
</script>

<template>
  <header class="header" :class="{ 'header--scrolled': scrolled }">
    <div class="container header__inner">
      <NuxtLink to="/" class="header__logo" aria-label="На главную">
        <span class="logo-text">wms<span class="logo-dot">.</span></span>
      </NuxtLink>

      <nav class="header__nav" aria-label="Основная навигация">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="header__link"
          :class="{ 'header__link--active': route.path.startsWith(item.to) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="header__actions">
        <button class="header__search-btn" @click="search.open()" aria-label="Поиск">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <button class="header__theme-btn" @click="toggle()" :aria-label="isDark ? 'Светлая тема' : 'Тёмная тема'" :title="isDark ? 'Светлая тема' : 'Тёмная тема'">
          <Transition name="theme-icon" mode="out-in">
            <svg v-if="isDark" key="sun" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 4.11l1.06-1.06M3.05 12.95l1.06-1.06" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <svg v-else key="moon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6.002 6.002 0 1 0 7 7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </Transition>
        </button>

        <button
          class="header__burger"
          :class="{ 'header__burger--open': mobileOpen }"
          @click="mobileOpen = !mobileOpen"
          :aria-expanded="mobileOpen"
          aria-label="Меню"
        >
          <span /><span /><span />
        </button>
      </div>
    </div>

    <Transition name="mobile-nav">
      <div v-if="mobileOpen" class="header__mobile">
        <nav class="header__mobile-nav">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="header__mobile-link"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 72px;
  transition: background 0.3s ease, border-color 0.3s ease;
  border-bottom: 1px solid transparent;
}

.header--scrolled {
  background: var(--header-scrolled-bg);
  backdrop-filter: blur(16px);
  border-bottom-color: var(--border);
}

.header__inner {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 40px;
}

.header__logo {
  flex-shrink: 0;
  margin-right: auto;
}

.logo-text {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--text);
  transition: color 0.2s;
}

.logo-dot {
  color: var(--accent);
}

.header__logo:hover .logo-text {
  color: var(--accent);
}

.header__nav {
  display: flex;
  gap: 32px;
}

@media (max-width: 640px) {
  .header__nav { display: none; }
}

.header__link {
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.05em;
  color: var(--text-2);
  transition: color 0.2s;
  position: relative;
  padding-bottom: 2px;
}

.header__link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s var(--ease-out);
}

.header__link:hover { color: var(--text); }
.header__link:hover::after { transform: scaleX(1); }
.header__link--active { color: var(--accent); }
.header__link--active::after { transform: scaleX(1); }

.header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header__search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-2);
  border-radius: var(--r-s);
  transition: color 0.2s, background 0.2s;
}

.header__search-btn:hover {
  color: var(--accent);
  background: var(--accent-dim);
}

.header__burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

@media (max-width: 640px) {
  .header__burger { display: flex; }
}

.header__burger span {
  display: block;
  width: 18px;
  height: 1px;
  background: var(--text-2);
  transition: transform 0.3s var(--ease-out), opacity 0.2s;
  transform-origin: center;
}

.header__burger--open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.header__burger--open span:nth-child(2) { opacity: 0; }
.header__burger--open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

.header__mobile {
  background: var(--bg-1);
  border-bottom: 1px solid var(--border);
}

.header__mobile-nav {
  display: flex;
  flex-direction: column;
  padding: 16px 24px 24px;
}

.header__mobile-link {
  font-size: 13px;
  color: var(--text-2);
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  transition: color 0.2s;
}

.header__mobile-link:last-child { border-bottom: none; }
.header__mobile-link:hover { color: var(--accent); }

.mobile-nav-enter-active,
.mobile-nav-leave-active { transition: opacity 0.2s ease, transform 0.2s var(--ease-out); }
.mobile-nav-enter-from,
.mobile-nav-leave-to { opacity: 0; transform: translateY(-8px); }

.header__theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-2);
  border-radius: var(--r-s);
  transition: color 0.2s, background 0.2s;
}

.header__theme-btn:hover {
  color: var(--accent);
  background: var(--accent-dim);
}

.theme-icon-enter-active,
.theme-icon-leave-active { transition: opacity 0.15s ease, transform 0.15s var(--ease-out); }
.theme-icon-enter-from   { opacity: 0; transform: rotate(-30deg) scale(0.7); }
.theme-icon-leave-to     { opacity: 0; transform: rotate(30deg) scale(0.7); }
</style>
