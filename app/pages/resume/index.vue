<script setup lang="ts">
import type { AboutMe, Experience, Education, SkillGroup } from '~/types'

const { locale, t } = useLocale()

useSeoMeta({
  title:       () => t('seo.resume_title'),
  description: () => t('seo.resume_desc'),
})

const [
  { data: about },
  { data: experience },
  { data: education },
  { data: skillGroups },
] = await Promise.all([
  useAsyncData(() => `about-${locale.value}`,      () => $fetch<AboutMe>('/api/about',                  { query: { locale: locale.value } }), { lazy: true }),
  useAsyncData(() => `experience-${locale.value}`, () => $fetch<Experience[]>('/api/resume/experience', { query: { locale: locale.value } }), { lazy: true }),
  useAsyncData(() => `education-${locale.value}`,  () => $fetch<Education[]>('/api/resume/education',   { query: { locale: locale.value } }), { lazy: true }),
  useAsyncData(() => `skills-${locale.value}`,     () => $fetch<SkillGroup[]>('/api/skills',            { query: { locale: locale.value } }), { lazy: true }),
])

const { formatPeriod } = useFormatDate()
</script>

<template>
  <div class="resume">
    <UiPageHeader
      :eyebrow="t('resume.eyebrow')"
      num="03"
      :title="t('resume.title')"
    />

    <section v-if="about" class="block">
      <p class="block__label">{{ t('resume.about') }}</p>
      <div class="block__body">
        <div class="prose" v-html="about.text" />
      </div>
    </section>

    <section v-if="experience?.length" class="block">
      <p class="block__label">{{ t('resume.experience') }}</p>
      <div class="block__body block__body--gap">
        <article v-for="item in experience" :key="item.id">
          <div class="item__head">
            <h2 class="item__title">{{ item.position }}</h2>
            <span class="item__period">{{ formatPeriod(item.date_from, item.date_to) }}</span>
          </div>
          <p class="item__place">{{ item.company }}</p>

          <ul v-if="item.bullets.length" class="bullets">
            <li v-for="bullet in item.bullets" :key="bullet.id" class="bullets__item">
              <span class="bullets__dash" aria-hidden="true">—</span>
              <span>{{ bullet.text }}</span>
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section v-if="education?.length" class="block">
      <p class="block__label">{{ t('resume.education') }}</p>
      <div class="block__body block__body--gap">
        <article v-for="item in education" :key="item.id">
          <div class="item__head">
            <h2 class="item__title item__title--sm">{{ item.specialization }}</h2>
            <span class="item__period">{{ formatPeriod(item.date_from, item.date_to) }}</span>
          </div>
          <p class="item__school">{{ item.institution }}</p>
        </article>
      </div>
    </section>

    <section v-if="skillGroups?.length" class="block block--last">
      <p class="block__label">{{ t('resume.skills') }}</p>
      <div class="block__body block__body--gap">
        <div v-for="group in skillGroups" :key="group.id">
          <p class="group__label">{{ group.name }}</p>
          <ul class="pills">
            <li v-for="skill in group.skills" :key="skill.id" class="pills__item">{{ skill.name }}</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.block {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(18px, 3vw, 56px);
  padding: clamp(24px, 3vw, 42px) 0;
  border-top: 1px dotted var(--dot);
}

.block--last { padding-bottom: 0; }

.block__label {
  flex: 0 0 clamp(110px, 15vw, 170px);
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--accent);
}

.block__body {
  flex: 1 1 min(100%, 440px);
  min-width: 0;
}

.block__body--gap {
  display: flex;
  flex-direction: column;
  gap: clamp(26px, 3vw, 44px);
}

.prose {
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--text-2);
  text-wrap: pretty;
}

.prose :deep(p + p) { margin-top: 18px; }

/* ── Запись ── */
.item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.item__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(20px, 2.3vw, 29px);
  letter-spacing: 0.01em;
  text-wrap: pretty;
}

.item__title--sm { font-size: clamp(18px, 2vw, 25px); }

.item__period {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--text-4);
  white-space: nowrap;
}

.item__place {
  margin-top: 8px;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.item__school {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-3);
}

/* ── Пункты ── */
.bullets { margin-top: 18px; }

.bullets__item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px dotted var(--dot);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-3);
  text-wrap: pretty;
}

.bullets__dash { color: var(--accent); flex-shrink: 0; }

/* ── Навыки ── */
.group__label {
  font-size: 11.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text);
  padding-bottom: 12px;
}

.pills { display: flex; flex-wrap: wrap; gap: 8px; }

.pills__item {
  font-size: 11.5px;
  color: var(--text-2);
  border: 1px solid var(--border-s);
  border-radius: var(--r-pill);
  padding: 8px 14px;
  transition: border-color 0.25s, color 0.25s;
}

.pills__item:hover { border-color: var(--accent); color: var(--accent); }
</style>
