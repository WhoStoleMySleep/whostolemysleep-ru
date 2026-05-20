<script setup lang="ts">
const year = new Date().getFullYear()
const { t } = useLocale()
const localePath = useLocalePath()
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__left">
        <span class="footer__logo">wms<span class="footer__dot">.</span></span>
        <p class="footer__copy">© {{ year }} — {{ t('footer.dev') }}</p>
      </div>

      <nav class="footer__nav" aria-label="Links">
        <NuxtLink :to="localePath('/blog')"     class="footer__link">{{ t('nav.blog') }}</NuxtLink>
        <NuxtLink :to="localePath('/projects')" class="footer__link">{{ t('nav.projects') }}</NuxtLink>
        <NuxtLink :to="localePath('/resume')"   class="footer__link">{{ t('nav.resume') }}</NuxtLink>
        <NuxtLink :to="localePath('/contacts')" class="footer__link">{{ t('nav.contacts') }}</NuxtLink>
        <a href="https://t.me/WhoStoleMySleepDev"       target="_blank" rel="noopener noreferrer" class="footer__link">TG</a>
        <a href="https://github.com/WhoStoleMySleepDev" target="_blank" rel="noopener noreferrer" class="footer__link">GitHub</a>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--border);
  padding: 40px 0;
  margin-top: 80px;
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
}

.footer__left { display: flex; align-items: baseline; gap: 20px; }

.footer__logo {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 500;
  color: var(--text-2);
}

.footer__dot { color: var(--accent); }

.footer__copy {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.05em;
}

.footer__nav { display: flex; gap: 24px; flex-wrap: wrap; }

.footer__link {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
  transition: color 0.2s;
}

.footer__link:hover { color: var(--accent); }
</style>
