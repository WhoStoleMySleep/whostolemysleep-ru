<script setup lang="ts">
const route  = useRoute()
const router = useRouter()

const navLinks = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Posts',     to: '/admin/posts' },
  { label: 'About',     to: '/admin/about' },
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

body { background: #0a0a0f; color: #e2e2e8; font-family: 'Martian Mono', monospace; font-size: 13px; }

.admin-shell { min-height: 100dvh; display: flex; flex-direction: column; }

.admin-header {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 32px;
  height: 56px;
  border-bottom: 1px solid #1e1e2e;
  background: #0d0d14;
  position: sticky;
  top: 0;
  z-index: 50;
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #e2e2e8;
  letter-spacing: -0.02em;
  text-decoration: none;
  flex-shrink: 0;
}

.admin-logo__dot  { color: #f0c060; }

.admin-logo__badge {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f0c060;
  background: rgba(240,192,96,0.1);
  border: 1px solid rgba(240,192,96,0.25);
  padding: 2px 6px;
}

.admin-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.admin-nav__link {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: #666680;
  padding: 6px 12px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
  text-decoration: none;
}

.admin-nav__link:hover { color: #a0a0b8; background: #14141e; }
.admin-nav__link--active { color: #f0c060; background: rgba(240,192,96,0.08); }

.admin-header__right { display: flex; align-items: center; gap: 8px; }

.admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.admin-btn--ghost {
  color: #666680;
  border: 1px solid #1e1e2e;
  background: transparent;
}

.admin-btn--ghost:hover { color: #a0a0b8; border-color: #333350; background: #14141e; }

.admin-btn--primary {
  color: #0a0a0f;
  background: #f0c060;
  border: 1px solid #f0c060;
  font-weight: 500;
}

.admin-btn--primary:hover { background: #e8b848; }
.admin-btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }

.admin-btn--danger {
  color: #ff6b6b;
  border: 1px solid #3a1a1a;
  background: transparent;
}

.admin-btn--danger:hover { background: #1e0f0f; border-color: #ff6b6b; }

.admin-main { flex: 1; padding: 32px; max-width: 1200px; width: 100%; margin: 0 auto; }
</style>
