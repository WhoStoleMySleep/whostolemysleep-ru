<script setup lang="ts">
import type { AboutMe, Experience, Education, SkillGroup } from '~/types'

/**
 * Печатная версия резюме: одна колонка, обычные заголовки, никаких
 * таблиц и иконок. Браузерное «Сохранить как PDF» даёт файл с живым
 * текстом — именно такой разбирают системы отбора резюме (ATS),
 * в отличие от картинки или вёрстки в две колонки.
 */
definePageMeta({ layout: false })

const { locale, t } = useLocale()
const localePath = useLocalePath()
const { formatPeriod } = useFormatDate()

const [
  { data: about },
  { data: experience },
  { data: education },
  { data: skillGroups },
  { data: settings },
] = await Promise.all([
  useAsyncData(() => `cv-about-${locale.value}`,      () => $fetch<AboutMe>('/api/about',                  { query: { locale: locale.value } })),
  useAsyncData(() => `cv-experience-${locale.value}`, () => $fetch<Experience[]>('/api/resume/experience', { query: { locale: locale.value } })),
  useAsyncData(() => `cv-education-${locale.value}`,  () => $fetch<Education[]>('/api/resume/education',   { query: { locale: locale.value } })),
  useAsyncData(() => `cv-skills-${locale.value}`,     () => $fetch<SkillGroup[]>('/api/skills',            { query: { locale: locale.value } })),
  useAsyncData('cv-settings', () => $fetch<{ email: string; github_url: string; telegram_url: string }>('/api/settings')),
])

// Имя документа — имя файла, который предложит «Сохранить как PDF».
const docTitle = computed(() => `${t('cv.name')} — CV`)

useHead(() => ({
  title: docTitle.value,
  htmlAttrs: { lang: locale.value },
  meta: [{ name: 'robots', content: 'noindex' }],
}))

function printPage() {
  window.print()
}

/** Ссылка без протокола: в печати «https://» только съедает строку. */
function short(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

const contacts = computed(() =>
  [settings.value?.email, short(settings.value?.github_url ?? ''), short(settings.value?.telegram_url ?? '')]
    .filter(Boolean),
)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <NuxtLink :to="localePath('/resume')" class="toolbar__link">← {{ t('cv.back') }}</NuxtLink>
      <p class="toolbar__hint">{{ t('cv.hint') }}</p>
      <button class="toolbar__btn" type="button" @click="printPage">{{ t('cv.print') }}</button>
    </div>

    <article class="sheet">
      <header class="head">
        <h1 class="head__name">{{ t('cv.name') }}</h1>
        <p class="head__role">{{ t('cv.role') }}</p>
        <p v-if="contacts.length" class="head__contacts">{{ contacts.join(' · ') }}</p>
      </header>

      <section v-if="about?.text" class="sect">
        <h2 class="sect__title">{{ t('cv.about') }}</h2>
        <div class="sect__body text" v-html="about.text" />
      </section>

      <section v-if="experience?.length" class="sect">
        <h2 class="sect__title">{{ t('cv.experience') }}</h2>
        <div v-for="item in experience" :key="item.id" class="entry">
          <h3 class="entry__title">{{ item.position }} — {{ item.company }}</h3>
          <p class="entry__period">{{ formatPeriod(item.date_from, item.date_to) }}</p>
          <ul v-if="item.bullets.length" class="entry__list">
            <li v-for="bullet in item.bullets" :key="bullet.id">{{ bullet.text }}</li>
          </ul>
        </div>
      </section>

      <section v-if="education?.length" class="sect">
        <h2 class="sect__title">{{ t('cv.education') }}</h2>
        <div v-for="item in education" :key="item.id" class="entry">
          <h3 class="entry__title">{{ item.specialization }} — {{ item.institution }}</h3>
          <p class="entry__period">{{ formatPeriod(item.date_from, item.date_to) }}</p>
        </div>
      </section>

      <section v-if="skillGroups?.length" class="sect">
        <h2 class="sect__title">{{ t('cv.skills') }}</h2>
        <p v-for="group in skillGroups" :key="group.id" class="skills">
          <span class="skills__name">{{ group.name }}:</span>
          {{ group.skills.map((s) => s.name).join(', ') }}
        </p>
      </section>
    </article>
  </div>
</template>

<style scoped>
/* Лист печатается в чёрном по белому независимо от темы сайта:
   принтер и парсер ATS одинаково не любят светлый текст на тёмном. */
.page {
  min-height: 100dvh;
  padding: 24px 16px 64px;
  background: #e9e9e9;
  color: #111;
}

.toolbar {
  max-width: 760px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 12px;
  color: #444;
}

.toolbar__link { color: #444; text-decoration: none; }
.toolbar__link:hover { color: #000; }

.toolbar__hint { flex: 1; min-width: 200px; font-size: 11px; line-height: 1.5; color: #666; }

.toolbar__btn {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 9px 18px;
  color: #fff;
  background: #111;
  border: 1px solid #111;
  border-radius: 999px;
  cursor: pointer;
}

.toolbar__btn:hover { background: #333; }

.sheet {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 56px;
  background: #fff;
  box-shadow: 0 2px 20px rgb(0 0 0 / 0.12);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13.5px;
  line-height: 1.6;
  color: #111;
}

.head { margin-bottom: 26px; }

.head__name { font-size: 27px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 4px; }
.head__role { font-size: 15px; color: #333; margin-bottom: 8px; }
.head__contacts { font-size: 12.5px; color: #444; }

.sect { margin-bottom: 24px; }

.sect__title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding-bottom: 5px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ccc;
}

.text :deep(p) { margin-bottom: 8px; }
.text :deep(p:last-child) { margin-bottom: 0; }
.text :deep(a) { color: #111; }

.entry { margin-bottom: 16px; break-inside: avoid; }
.entry:last-child { margin-bottom: 0; }

.entry__title { font-size: 14px; font-weight: 700; }
.entry__period { font-size: 12px; color: #555; margin-bottom: 5px; }

.entry__list { margin: 0; padding-left: 18px; }
.entry__list li { margin-bottom: 3px; }

.skills { margin-bottom: 6px; }
.skills:last-child { margin-bottom: 0; }
.skills__name { font-weight: 700; }

@media print {
  .page { padding: 0; background: #fff; }
  .toolbar { display: none; }
  .sheet {
    max-width: none;
    padding: 0;
    box-shadow: none;
    font-size: 11pt;
  }
  .sect { break-inside: avoid-page; }
}

@page { margin: 16mm 14mm; }
</style>
