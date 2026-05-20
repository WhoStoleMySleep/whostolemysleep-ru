<script setup lang="ts">
import type { Product, AboutMe } from '~/types'

useSeoMeta({
  title: 'Frontend-разработчик',
  description: 'Frontend-разработчик с опытом более 4 лет. React, Vue, Next.js, Nuxt, TypeScript.',
})

const { data: about } = await useFetch<AboutMe>('/api/about')
const { data: blog } = await useFetch<Product[]>('/api/products/blog')
const { data: projects } = await useFetch<Product[]>('/api/products/project')

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
          <p class="hero__handle">@whostolemysleep</p>
        </div>
      </div>

      <div class="hero__scroll-hint" aria-hidden="true">
        <span class="hero__scroll-line" />
        <span class="hero__scroll-label">scroll</span>
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
  gap: 12px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.6s ease 0.8s;
}

.hero--visible .hero__aside { opacity: 1; }

@media (max-width: 768px) {
  .hero__aside { align-items: flex-start; }
}

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
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: scroll-hint 2.5s ease infinite;
}

@keyframes scroll-hint {
  0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
  50% { opacity: 0.7; transform: translateX(-50%) translateY(8px); }
}

.hero__scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--accent), transparent);
}

.hero__scroll-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-3);
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
