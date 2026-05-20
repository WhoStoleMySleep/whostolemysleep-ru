<script setup lang="ts">
import type { AboutMe, Inform, Skills } from '~/types'

useSeoMeta({
  title: 'Резюме',
  description: 'Опыт работы, образование и технические навыки frontend-разработчика.',
})

const [
  { data: about },
  { data: experience },
  { data: education },
  { data: skills },
] = await Promise.all([
  useFetch<AboutMe>('/api/about'),
  useFetch<Inform[]>('/api/inform/experience'),
  useFetch<Inform[]>('/api/inform/education'),
  useFetch<Skills>('/api/skills'),
])
</script>

<template>
  <div class="page resume-page">
    <div class="container">
      <header class="page-header">
        <p class="eyebrow">Резюме</p>
        <h1 class="page-title">Опыт &amp; Навыки</h1>
      </header>

      <!-- About -->
      <section v-if="about" class="resume-section">
        <div class="resume-section__label">
          <p class="eyebrow">Обо мне</p>
        </div>
        <div class="resume-section__content">
          <div class="resume-about" v-html="about.text" />
        </div>
      </section>

      <!-- Experience -->
      <section v-if="experience?.length" class="resume-section">
        <div class="resume-section__label">
          <p class="eyebrow">Опыт</p>
        </div>
        <div class="resume-section__content">
          <div class="resume-timeline">
            <div
              v-for="item in experience"
              :key="item.id"
              class="resume-item"
            >
              <div class="resume-item__header">
                <div>
                  <h3 class="resume-item__title">{{ item.title }}</h3>
                  <p class="resume-item__place">{{ item.place }}</p>
                </div>
                <span class="resume-item__date">{{ item.dateString }}</span>
              </div>
              <ul v-if="item.InformDetails.length" class="resume-item__details">
                <li v-for="detail in item.InformDetails" :key="detail.id">
                  {{ detail.text }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Education -->
      <section v-if="education?.length" class="resume-section">
        <div class="resume-section__label">
          <p class="eyebrow">Образование</p>
        </div>
        <div class="resume-section__content">
          <div class="resume-timeline">
            <div
              v-for="item in education"
              :key="item.id"
              class="resume-item"
            >
              <div class="resume-item__header">
                <div>
                  <h3 class="resume-item__title">{{ item.title }}</h3>
                  <p class="resume-item__place">{{ item.place }}</p>
                </div>
                <span class="resume-item__date">{{ item.dateString }}</span>
              </div>
              <ul v-if="item.InformDetails.length" class="resume-item__details">
                <li v-for="detail in item.InformDetails" :key="detail.id">
                  {{ detail.text }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Skills -->
      <section v-if="skills" class="resume-section">
        <div class="resume-section__label">
          <p class="eyebrow">Навыки</p>
        </div>
        <div class="resume-section__content">
          <div class="skills-grid">
            <div class="skill-group">
              <p class="skill-group__label">Языки</p>
              <p class="skill-group__value">{{ skills.languages }}</p>
            </div>
            <div class="skill-group">
              <p class="skill-group__label">Фреймворки</p>
              <p class="skill-group__value">{{ skills.frameworks }}</p>
            </div>
            <div class="skill-group">
              <p class="skill-group__label">CMS</p>
              <p class="skill-group__value">{{ skills.cms }}</p>
            </div>
            <div class="skill-group">
              <p class="skill-group__label">Инструменты</p>
              <p class="skill-group__value">{{ skills.instruments }}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
.page { padding: 64px 0 120px; }
.page-header { margin-bottom: 80px; }
.eyebrow { margin-bottom: 16px; }

.page-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 300;
  letter-spacing: -0.03em;
}

.resume-section {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 64px;
  padding: 48px 0;
  border-top: 1px solid var(--border);
}

@media (max-width: 768px) {
  .resume-section { grid-template-columns: 1fr; gap: 24px; }
}

.resume-about {
  font-family: var(--font-display);
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 300;
  line-height: 1.6;
  color: var(--text-2);
}

.resume-timeline { display: flex; flex-direction: column; gap: 40px; }

.resume-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.resume-item__title {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.5vw, 26px);
  font-weight: 400;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.resume-item__place {
  font-size: 12px;
  color: var(--accent);
  letter-spacing: 0.05em;
}

.resume-item__date {
  font-size: 11px;
  color: var(--text-3);
  white-space: nowrap;
  letter-spacing: 0.05em;
  padding-top: 4px;
  flex-shrink: 0;
}

.resume-item__details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 20px;
}

.resume-item__details li {
  font-size: 13px;
  color: var(--text-2);
  position: relative;
}

.resume-item__details li::before {
  content: '—';
  position: absolute;
  left: -18px;
  color: var(--accent);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

@media (max-width: 640px) { .skills-grid { grid-template-columns: 1fr; } }

.skill-group {
  padding: 24px;
  border: 1px solid var(--border);
  background: var(--bg-1);
}

.skill-group__label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 12px;
}

.skill-group__value {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.8;
}
</style>
