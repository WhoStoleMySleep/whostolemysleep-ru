<script setup lang="ts">
const route  = useRoute()
const router = useRouter()

const navLinks = [
  { label: 'Dashboard',  to: '/admin' },
  { label: 'Posts',      to: '/admin/posts' },
  { label: 'About',      to: '/admin/about' },
  { label: 'Experience', to: '/admin/experience' },
  { label: 'Education',  to: '/admin/education' },
  { label: 'Skills',     to: '/admin/skills' },
  { label: 'Settings',   to: '/admin/settings' },
]

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  router.push('/admin/login')
}
</script>

<template>
  <div class="admin-shell">
    <header class="admin-header">
      <NuxtLink to="/admin" class="admin-logo">
        wms<span class="admin-logo__dot">.</span>
        <span class="admin-logo__badge">admin</span>
      </NuxtLink>

      <nav class="admin-nav">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="admin-nav__link"
          :class="{ 'admin-nav__link--active': route.path === link.to || (link.to !== '/admin' && route.path.startsWith(link.to)) }"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="admin-header__right">
        <NuxtLink to="/" target="_blank" class="admin-btn admin-btn--ghost" title="Open site">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Site
        </NuxtLink>
        <button class="admin-btn admin-btn--ghost" @click="logout">Logout</button>
      </div>
    </header>

    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { background: var(--bg); color: var(--text); font-family: var(--font-mono); font-size: 13px; }

.admin-shell { min-height: 100dvh; display: flex; flex-direction: column; }

.admin-header {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 32px;
  height: 56px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-1);
  position: sticky;
  top: 0;
  z-index: 50;
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  flex-shrink: 0;
}

.admin-logo__dot  { color: var(--accent); }

.admin-logo__badge {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--accent-line);
  border-radius: var(--r-pill);
  padding: 3px 9px;
}

.admin-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.admin-nav__link {
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-4);
  padding: 7px 13px;
  border-radius: var(--r-pill);
  transition: color 0.15s, background 0.15s;
  text-decoration: none;
}

.admin-nav__link:hover { color: var(--text-3); background: var(--bg-3); }
.admin-nav__link--active { color: var(--accent); background: var(--accent-dim); }

.admin-header__right { display: flex; align-items: center; gap: 8px; }

.admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 7px 15px;
  border-radius: var(--r-pill);
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.admin-btn--ghost {
  color: var(--text-4);
  border: 1px solid var(--border);
  background: transparent;
}

.admin-btn--ghost:hover { color: var(--text-3); border-color: var(--border-s); background: var(--bg-3); }

.admin-btn--primary {
  color: var(--on-accent);
  background: var(--accent-flat);
  border: 1px solid var(--accent-flat);
  font-weight: 500;
}

.admin-btn--primary:hover { filter: brightness(1.08); }
.admin-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }

.admin-btn--danger {
  color: var(--red);
  border: 1px solid var(--red-border);
  background: transparent;
}

.admin-btn--danger:hover { background: var(--red-bg); border-color: var(--red); }

.admin-main { flex: 1; padding: 32px; max-width: 1200px; width: 100%; margin: 0 auto; }

/* ── Геометрия контролов ──
   Классы объявлены на самих страницах, но радиусы задаются здесь:
   иначе их пришлось бы держать в синхроне по девяти файлам. Сами
   страницы border-radius не задают, поэтому scoped-стили не конфликтуют. */
.admin-input,
.field-input,
.text-pane,
.text-preview,
.quick-card,
.empty-state { border-radius: var(--r-s); }

.act-btn,
.lang-tab,
.preview-toggle { border-radius: var(--r-pill); }

.admin-input:focus,
.field-input:focus { border-color: var(--accent); outline: none; }
</style>
