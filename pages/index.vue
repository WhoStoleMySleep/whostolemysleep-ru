<script setup lang="ts">
import type { Post, AboutMe } from '~/types'

useSeoMeta({
  title: 'Frontend-разработчик',
  description: 'Frontend-разработчик с опытом более 4 лет. React, Vue, Next.js, Nuxt, TypeScript.',
})

const { data: about } = await useFetch<AboutMe>('/api/about')
const { data: blog } = await useFetch<Post[]>('/api/posts/blog')
const { data: projects } = await useFetch<Post[]>('/api/posts/project')

const news = computed(() => {
  const all = [...(blog.value ?? []), ...(projects.value ?? [])]
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)
})

const isVisible = ref(false)
onMounted(() => {
  requestAnimationFrame(() => { isVisible.value = true })
})
</script>

<template>
  <div class="home">

    <!-- ── Hero ── -->
    <section class="hero" :class="{ 'hero--visible': isVisible }">
      <div class="hero__bg-glow" aria-hidden="true" />
      <div class="container hero__inner">
        <div class="hero__content">
          <p class="eyebrow hero__eyebrow">Frontend Разработка</p>
          <h1 class="hero__title">
            <span class="hero__title-line">Основное занятие —</span>
            <span class="hero__title-line hero__title-line--accent">создание сайтов</span>
            <span class="hero__title-line">с опытом более</span>
            <span class="hero__title-counter">
              4<span class="hero__title-plus">+</span>
              <span class="hero__title-years">лет</span>
            </span>
          </h1>

          <div class="hero__nav">
            <NuxtLink to="/blog" class="hero__nav-item">
              <span class="hero__nav-num">01</span>
              <span class="hero__nav-label">Блог</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10M7 3L10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </NuxtLink>
            <NuxtLink to="/projects" class="hero__nav-item">
              <span class="hero__nav-num">02</span>
              <span class="hero__nav-label">Проекты</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10M7 3L10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </NuxtLink>
            <NuxtLink to="/resume" class="hero__nav-item">
              <span class="hero__nav-num">03</span>
              <span class="hero__nav-label">Резюме</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10M7 3L10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </NuxtLink>
            <NuxtLink to="/contacts" class="hero__nav-item">
              <span class="hero__nav-num">04</span>
              <span class="hero__nav-label">Контакты</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10M7 3L10 6L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </NuxtLink>
          </div>
        </div>

        <div class="hero__aside">
          <div class="hero__status">
            <span class="hero__status-dot" aria-hidden="true" />
            <span class="hero__status-text">Открыт к предложениям</span>
          </div>
          <div class="hero__socials">
            <a href="https://t.me/WhoStoleMySleepDev" target="_blank" rel="noopener noreferrer" class="hero__social-link" aria-label="Telegram">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21.8 2.3L1.4 10.1c-1.3.5-1.3 1.3-.2 1.6l5.1 1.6 11.8-7.5c.6-.3 1.1-.1.7.2L8.5 15.5l-.4 5.3c.6 0 .9-.3 1.2-.6l2.9-2.8 6 4.4c1.1.6 1.9.3 2.1-.9l3.8-17.9c.5-1.5-.6-2.2-1.8-1.7z" fill="currentColor"/>
              </svg>
              <span>@whostolemysleep</span>
            </a>
            <a href="https://github.com/WhoStoleMySleepDev" target="_blank" rel="noopener noreferrer" class="hero__social-link" aria-label="GitHub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48v-1.7C6.73 19.9 6.14 18 6.14 18c-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12c0-5.52-4.48-10-10-10z" fill="currentColor"/>
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>

      <div class="hero__scroll-hint" aria-hidden="true">
        <span class="hero__scroll-line" />
      </div>
    </section>

    <!-- ── About ── -->
    <section v-if="about" class="section about">
      <div class="container">
        <p class="eyebrow section__eyebrow">Обо мне</p>
        <div class="about__grid">
          <div class="about__text" v-html="about.text" />
          <div class="about__links">
            <UiButton to="/resume">Посмотреть резюме</UiButton>
            <UiButton to="/contacts" variant="ghost">Написать мне</UiButton>
          </div>
        </div>
      </div>
    </section>

    <!-- ── News ── -->
    <section v-if="news.length" class="section news">
      <div class="container">
        <div class="section__header">
          <p class="eyebrow section__eyebrow">Последние записи</p>
          <NuxtLink to="/blog" class="section__more">Все записи →</NuxtLink>
        </div>
        <div class="news__grid">
          <UiCard v-for="item in news" :key="item.id" :item="item" />
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ── Hero ── */
.hero {
  position: relative;
  min-height: calc(100dvh - 72px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.hero__bg-glow {
  position: absolute;
  top: -20%;
  left: -10%;
  width: 70%;
  height: 80%;
  background: radial-gradient(ellipse at 30% 40%, var(--accent-glow) 0%, transparent 60%);
  pointer-events: none;
}

.hero__inner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 60px;
  padding-top: 80px;
  padding-bottom: 80px;
}

@media (max-width: 768px) {
  .hero__inner { flex-direction: column; align-items: flex-start; gap: 48px; }
}

.hero__content { max-width: 680px; }

.hero__eyebrow {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.6s ease 0.1s, transform 0.6s var(--ease-out) 0.1s;
  margin-bottom: 28px;
}

.hero--visible .hero__eyebrow { opacity: 1; transform: none; }

.hero__title {
  font-family: var(--font-display);
  font-size: clamp(44px, 7vw, 96px);
  font-weight: 300;
  line-height: 1.0;
  letter-spacing: -0.03em;
  margin-bottom: 48px;
}

.hero__title-line {
  display: block;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s ease, transform 0.7s var(--ease-out);
  color: var(--text);
}

.hero__title-line--accent { font-style: italic; color: var(--accent); }

.hero__title-line:nth-child(1) { transition-delay: 0.2s; }
.hero__title-line:nth-child(2) { transition-delay: 0.32s; }
.hero__title-line:nth-child(3) { transition-delay: 0.44s; }

.hero--visible .hero__title-line { opacity: 1; transform: none; }

.hero__title-counter {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: var(--text);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s ease 0.56s, transform 0.7s var(--ease-out) 0.56s;
}

.hero--visible .hero__title-counter { opacity: 1; transform: none; }

.hero__title-plus { color: var(--accent); font-size: 0.6em; }
.hero__title-years { font-size: 0.4em; color: var(--text-2); font-family: var(--font-mono); font-weight: 300; letter-spacing: 0.05em; align-self: center; }

.hero__nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--border);
  opacity: 0;
  transition: opacity 0.6s ease 0.7s;
}

.hero--visible .hero__nav { opacity: 1; }

.hero__nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  color: var(--text-2);
  transition: color 0.2s, padding-left 0.3s var(--ease-out);
}

.hero__nav-item:hover {
  color: var(--accent);
  padding-left: 8px;
}

.hero__nav-num {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--text-3);
  width: 20px;
  flex-shrink: 0;
}

.hero__nav-label { flex: 1; font-size: 13px; letter-spacing: 0.05em; }

.hero__aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.6s ease 0.8s;
}

.hero--visible .hero__aside { opacity: 1; }

@media (max-width: 768px) {
  .hero__aside { align-items: flex-start; }
}

.hero__socials {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .hero__socials { align-items: flex-start; }
}

.hero__social-link {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.08em;
  transition: color 0.2s;
}

.hero__social-link:hover { color: var(--accent); }

.hero__status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgba(74, 222, 128, 0.2);
  background: rgba(74, 222, 128, 0.05);
}

.hero__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse-dot 2s ease infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(74, 222, 128, 0); }
}

.hero__status-text {
  font-size: 11px;
  letter-spacing: 0.05em;
  color: #4ade80;
}

.hero__handle {
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: 0.1em;
}

.hero__scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  animation: scroll-fade 3s ease infinite;
}

@keyframes scroll-fade {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.5; }
}

.hero__scroll-line {
  display: block;
  width: 1px;
  height: 48px;
  background: linear-gradient(to bottom, transparent, var(--accent), transparent);
}

/* ── Sections ── */
.section { padding: 96px 0; }

.section__eyebrow { margin-bottom: 32px; }

.section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.section__more {
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--text-3);
  transition: color 0.2s;
}

.section__more:hover { color: var(--accent); }

/* ── About ── */
.about__grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 64px;
  align-items: start;
}

@media (max-width: 768px) {
  .about__grid { grid-template-columns: 1fr; gap: 32px; }
}

.about__text {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 300;
  line-height: 1.55;
  color: var(--text-2);
  max-width: 640px;
}

.about__links {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

/* ── News ── */
.news__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border);
}

@media (max-width: 1024px) {
  .news__grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .news__grid { grid-template-columns: 1fr; }
}
</style>
