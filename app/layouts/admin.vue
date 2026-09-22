<script setup lang="ts">
const route  = useRoute()
const router = useRouter()

/**
 * A side menu instead of the old row of links in the header: there are nine
 * sections, they only fitted on one line without grouping, and the fact that
 * About / Experience / Education / Skills are all the resume did not read.
 */
const sections = [
  {
    label: 'Content',
    links: [
      { label: 'Dashboard',        to: '/admin' },
      { label: 'Posts & Projects', to: '/admin/posts' },
    ],
  },
  {
    label: 'Resume',
    links: [
      { label: 'About',      to: '/admin/about' },
      { label: 'Experience', to: '/admin/experience' },
      { label: 'Education',  to: '/admin/education' },
      { label: 'Skills',     to: '/admin/skills' },
      { label: 'CV / Import', to: '/admin/cv' },
    ],
  },
  {
    label: 'System',
    links: [
      { label: 'Settings', to: '/admin/settings' },
    ],
  },
]

const navOpen = ref(false)
watch(() => route.path, () => { navOpen.value = false })

function isActive(to: string) {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
}

async function logout() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  useState('admin:authed').value = false
  router.push('/admin/login')
}
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-side" :class="{ 'admin-side--open': navOpen }">
      <NuxtLink to="/admin" class="admin-logo">
        wms<span class="admin-logo__dot">.</span>
        <span class="admin-logo__badge">admin</span>
      </NuxtLink>

      <nav class="admin-nav">
        <div v-for="section in sections" :key="section.label" class="admin-nav__group">
          <p class="admin-nav__label">{{ section.label }}</p>
          <NuxtLink
            v-for="link in section.links"
            :key="link.to"
            :to="link.to"
            class="admin-nav__link"
            :class="{ 'admin-nav__link--active': isActive(link.to) }"
          >
            {{ link.label }}
          </NuxtLink>
        </div>
      </nav>

      <div class="admin-side__foot">
        <NuxtLink to="/" target="_blank" class="admin-btn admin-btn--ghost">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Site
        </NuxtLink>
        <button class="admin-btn admin-btn--ghost" type="button" @click="logout">Logout</button>
      </div>
    </aside>

    <div class="admin-body">
      <button class="admin-burger admin-btn admin-btn--ghost" type="button" @click="navOpen = !navOpen">
        Menu
      </button>

      <main class="admin-main">
        <slot />
      </main>
    </div>

    <AdminToasts />
    <AdminConfirm />
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { background: var(--bg); color: var(--text); font-family: var(--font-mono); font-size: 13px; }

.admin-shell { min-height: 100dvh; display: flex; }

/* ── Sidebar ── */
.admin-side {
  position: sticky;
  top: 0;
  flex-shrink: 0;
  width: 220px;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 16px;
  border-right: 1px solid var(--border);
  background: var(--bg-1);
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  padding: 0 8px;
}

.admin-logo__dot { color: var(--accent); }

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
  padding: 3px 8px;
}

.admin-nav { flex: 1; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }

.admin-nav__group { display: flex; flex-direction: column; gap: 2px; }

.admin-nav__label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-4);
  padding: 0 10px 6px;
}

.admin-nav__link {
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--text-3);
  padding: 8px 10px;
  border-radius: var(--r-s);
  transition: color 0.15s, background 0.15s;
  text-decoration: none;
}

.admin-nav__link:hover { color: var(--text); background: var(--bg-3); }

.admin-nav__link--active {
  color: var(--accent);
  background: var(--accent-dim);
}

.admin-side__foot { display: flex; flex-direction: column; gap: 6px; }

/* ── Content ── */
.admin-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.admin-main { flex: 1; padding: 32px; max-width: 1100px; width: 100%; }

.admin-burger { display: none; margin: 16px 16px 0; align-self: flex-start; }

@media (max-width: 860px) {
  .admin-side {
    position: fixed;
    z-index: 120;
    transform: translateX(-100%);
    transition: transform 0.2s var(--ease-out);
  }
  .admin-side--open { transform: none; }
  .admin-burger { display: inline-flex; }
  .admin-main { padding: 20px 16px; }
}

/* ── Buttons ── */
.admin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: inherit;
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 8px 15px;
  border-radius: var(--r-pill);
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
  text-decoration: none;
  white-space: nowrap;
}

.admin-btn--ghost {
  color: var(--text-4);
  border: 1px solid var(--border);
  background: transparent;
}

.admin-btn--ghost:hover { color: var(--text-3); border-color: var(--border-s); background: var(--bg-3); }

.admin-btn--primary {
  color: var(--on-accent);
  background: var(--accent-btn);
  border: 1px solid var(--accent-btn);
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

/* ── Shared control geometry ──
   The classes are used on the pages, the radii live here: otherwise they would have
   to be kept in sync across nine files. */
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

/* ── Panel ── */
.admin-panel {
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  background: var(--bg-1);
  padding: 20px;
}

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.admin-empty {
  padding: 28px 20px;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-4);
  border: 1px dashed var(--border);
  border-radius: var(--r-s);
}
</style>
