<script setup lang="ts">
const year = new Date().getFullYear()
const { t } = useLocale()
const localePath = useLocalePath()
const { data: siteSettings } = await useSettings()

/** Набор и порядок ссылок — как в макете: Telegram, GitHub, Email, Privacy. */
const links = computed(() => [
  { label: 'Telegram', href: siteSettings.value?.telegram_url ?? 'https://t.me/WhoStoleMySleepDev', external: true },
  { label: 'GitHub',   href: siteSettings.value?.github_url   ?? 'https://github.com/WhoStoleMySleepDev', external: true },
  { label: 'Email',    href: `mailto:${siteSettings.value?.email ?? 'whostolemysleep@gmail.com'}`, external: true },
])
</script>

<template>
  <footer class="foot">
    <p class="foot__copy">© {{ year }} — {{ t('footer.dev') }}</p>

    <nav class="foot__nav" aria-label="Links">
      <a
        v-for="link in links"
        :key="link.label"
        :href="link.href"
        target="_blank"
        rel="noopener noreferrer"
        class="foot__link"
      >{{ link.label }}</a>
      <NuxtLink :to="localePath('/privacy')" class="foot__link">{{ t('nav.privacy') }}</NuxtLink>
    </nav>
  </footer>
</template>

<style scoped>
.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 24px;
  padding: clamp(16px, 2vw, 24px) clamp(18px, 3vw, 56px);
  border-top: 1px dotted var(--border-s);
}

.foot__copy {
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-4);
}

.foot__nav { display: flex; flex-wrap: wrap; gap: 12px 20px; }

.foot__link {
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-3);
  transition: color 0.2s;
}

.foot__link:hover { color: var(--accent); }
</style>
