<script setup lang="ts">
import type { Post, AboutMe } from '~/types'

const { locale, t } = useLocale()
const localePath = useLocalePath()
const { format } = useFormatDate()
const { linkFor } = usePostLink()

useSeoMeta({
  title:       () => t('seo.home_title'),
  description: () => t('seo.home_desc'),
})

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'whostolemysleep',
      url: 'https://whostolemysleep.ru',
      jobTitle: 'Full-Stack Developer',
      email: 'whostolemysleep@gmail.com',
      sameAs: [
        'https://github.com/WhoStoleMySleepDev',
        'https://t.me/WhoStoleMySleepDev',
      ],
      knowsAbout: ['Nuxt', 'Vue', 'TypeScript', 'Rust', 'Tauri', 'React', 'Next.js', 'Node.js'],
    }),
  }],
})

const { data: siteSettings } = await useSettings()
const { data: about }    = await useAsyncData(() => `about-${locale.value}`,         () => $fetch<AboutMe>('/api/about',          { query: { locale: locale.value } }), { lazy: true })
const { data: blog }     = await useAsyncData(() => `posts-blog-${locale.value}`,    () => $fetch<Post[]>('/api/posts/blog',      { query: { locale: locale.value } }), { lazy: true })
const { data: projects } = await useAsyncData(() => `posts-project-${locale.value}`, () => $fetch<Post[]>('/api/posts/project',   { query: { locale: locale.value } }), { lazy: true })

const news = computed(() => {
  const all = [...(blog.value ?? []), ...(projects.value ?? [])]
  return all
    .sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime())
    .slice(0, 6)
    .map(post => ({ ...post, ...linkFor(post) }))
})

/** Стаж живёт только здесь — в заголовке его больше нет, чтобы не дублировать. */
const years = computed(() => siteSettings.value?.years_experience ?? 5)

const stack = computed(() => [
  { k: t('stack.f1_k'), v: t('stack.f1_v') },
  { k: t('stack.f2_k'), v: t('stack.f2_v') },
  { k: t('stack.f3_k'), v: t('stack.f3_v') },
  { k: t('stack.f4_k'), v: t('stack.f4_v') },
])

const brings = computed(() => [
  { num: '01', text: t('brings.b1') },
  { num: '02', text: t('brings.b2') },
  { num: '03', text: t('brings.b3') },
])
</script>

<template>
  <div class="home">

    <!-- Герой -->
    <section class="hero">
      <div class="hero__blob" aria-hidden="true" />

      <div class="hero__inner">
        <p class="hero__eyebrow eyebrow">
          <span class="hero__pulse" aria-hidden="true" />
          {{ t('hero.eyebrow') }}
        </p>

        <h1 class="hero__title">
          {{ t('hero.line1') }}<br>
          {{ t('hero.line2') }}<span class="hero__stop">.</span>
        </h1>

        <div class="hero__lede-row">
          <span class="hero__rule" aria-hidden="true" />
          <i18n-t keypath="hero.lede" tag="p" class="hero__lede" scope="global">
            <template #years>
              <span class="hero__years">{{ years }}+ {{ t('hero.years') }}</span>
            </template>
          </i18n-t>
        </div>

        <div class="hero__cta">
          <NuxtLink :to="localePath('/resume')" class="btn-solid">{{ t('hero.cta_cv') }}</NuxtLink>
          <NuxtLink :to="localePath('/projects')" class="btn-outline">{{ t('hero.cta_projects') }}</NuxtLink>

          <span v-if="siteSettings?.open_to_work" class="hero__status">
            <span class="hero__pulse" aria-hidden="true" />
            {{ t('hero.status') }}
          </span>
        </div>
      </div>
    </section>

    <!-- Стек -->
    <section class="stack">
      <div v-for="row in stack" :key="row.k" class="stack__cell">
        <span class="stack__k">{{ row.k }}</span>
        <span class="stack__v">{{ row.v }}</span>
      </div>
    </section>

    <!-- Обо мне -->
    <section v-if="about" class="section about">
      <p class="eyebrow section__eyebrow">{{ t('about.eyebrow') }}</p>
      <div class="about__grid">
        <div class="about__text" v-html="about.text" />
        <div class="about__links">
          <UiButton :to="localePath('/resume')">{{ t('about.resume') }}</UiButton>
          <UiButton :to="localePath('/contacts')" variant="ghost">{{ t('about.contact') }}</UiButton>
        </div>
      </div>
    </section>

    <!-- Последнее -->
    <section v-if="news.length" class="section">
      <div class="section__head">
        <h2 class="section__title">{{ t('news.eyebrow') }}</h2>
        <NuxtLink :to="localePath('/blog')" class="section__more">{{ t('news.all') }}</NuxtLink>
      </div>

      <div class="rows">
        <NuxtLink
          v-for="item in news"
          :key="item.id"
          :to="item.href"
          :target="item.isExternal ? '_blank' : undefined"
          :rel="item.isExternal ? 'noopener noreferrer' : undefined"
          class="row"
        >
          <span class="row__meta">
            {{ item.type === 'blog' ? t('card.blog') : t('card.project') }}
            <template v-if="item.published_at"> · {{ format(item.published_at) }}</template>
          </span>
          <span class="row__title">{{ item.title }}</span>
          <span class="row__desc">{{ item.excerpt }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Что приношу проекту -->
    <section class="section brings">
      <div class="brings__list-col">
        <p class="brings__title">{{ t('brings.title') }}</p>
        <div class="brings__list">
          <div v-for="b in brings" :key="b.num" class="brings__item">
            <span class="brings__num">{{ b.num }}</span>
            <p class="brings__text">{{ b.text }}</p>
          </div>
        </div>
      </div>

      <div class="brings__aside">
        <p class="brings__looking">{{ t('brings.looking') }}</p>
        <NuxtLink :to="localePath('/contacts')" class="brings__cta">{{ t('brings.cta') }}</NuxtLink>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* ═══ Герой ═══
   overflow: clip живёт здесь, а не на .panel в лейауте: у панели он
   сломал бы position: sticky у бокового рейла. Обрезать нужно только
   круг, который намеренно выходит за край. */
/* Без своего overflow: круг намеренно выходит за секцию и обрезается
   панелью по скруглённому углу — так же, как в макете. */
.hero {
  position: relative;
  padding: clamp(12px, 3vw, 40px) 0 clamp(30px, 4vw, 56px);
}

.hero__blob {
  position: absolute;
  top: -6%;
  right: -3%;
  width: min(34vw, 330px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--accent-flat);
  animation: grow 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.hero__inner { position: relative; }

.hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-3);
  animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.hero__pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  animation: pulse 2.4s infinite;
}

.hero__title {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: var(--hero-size);
  line-height: var(--display-lh);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin: clamp(20px, 3vw, 36px) 0 0;
  text-shadow: var(--display-shadow);
  animation:
    rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.08s both,
    glitch 9s 2s infinite;
}

.hero__stop { color: var(--text-strong); }

.hero__lede-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px 28px;
  margin-top: clamp(24px, 3vw, 40px);
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.16s both;
}

.hero__rule {
  height: 1px;
  flex: 1 1 60px;
  background: repeating-linear-gradient(90deg, var(--dash) 0 3px, transparent 3px 8px);
}

.hero__lede {
  max-width: 420px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-2);
  text-wrap: pretty;
}

.hero__years { color: var(--accent); }

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: clamp(26px, 3vw, 40px);
  animation: rise 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.24s both;
}

.btn-solid,
.btn-outline {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  border-radius: var(--r-pill);
  padding: 15px 28px;
  transition: transform 0.25s, border-color 0.25s;
}

.btn-solid { background: var(--accent-btn); color: var(--on-accent); }
.btn-solid:hover { transform: translateY(-2px); color: var(--on-accent); }

.btn-outline { border: 1px solid var(--border-s); }
.btn-outline:hover { border-color: var(--accent); transform: translateY(-2px); }

.hero__status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 6px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-3);
}

/* ═══ Стек ═══ */
.stack {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
}

.stack__cell {
  flex: 1 1 240px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: clamp(20px, 2.4vw, 30px);
  background: var(--bg-1);
  transition: background 0.3s;
}

.stack__cell:hover { background: var(--bg-2); }

.stack__k {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.stack__v {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-3);
  text-wrap: pretty;
}

/* ═══ Секции ═══ */
.section { padding: clamp(34px, 4.4vw, 68px) 0 0; }

.section__eyebrow { margin-bottom: 22px; }

.section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 22px;
}

.section__title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(22px, 2.8vw, 36px);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.section__more {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-3);
  transition: color 0.2s;
}

.section__more:hover { color: var(--accent); }

/* ═══ Обо мне ═══ */
.about__grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 48px;
  align-items: start;
}

@media (max-width: 900px) {
  .about__grid { grid-template-columns: 1fr; gap: 28px; }
}

.about__text {
  max-width: 640px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--text-2);
  text-wrap: pretty;
}

.about__text :deep(p + p) { margin-top: 18px; }

.about__links {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

/* ═══ Что приношу проекту ═══ */
.brings {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(24px, 3vw, 48px);
}

.brings__list-col { flex: 1 1 min(100%, 380px); min-width: 0; }

.brings__title {
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-3);
  padding-bottom: 18px;
}

.brings__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
}

.brings__item {
  display: flex;
  gap: 16px;
  padding: clamp(18px, 2vw, 26px);
  background: var(--bg-1);
}

.brings__num {
  flex-shrink: 0;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--accent);
}

.brings__text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
  text-wrap: pretty;
}

.brings__aside {
  flex: 1 1 min(100%, 320px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 22px;
}

.brings__looking {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(18px, 2.1vw, 26px);
  line-height: 1.35;
  letter-spacing: 0.005em;
  text-wrap: pretty;
}

.brings__cta {
  align-self: start;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  border: 1px solid var(--accent);
  border-radius: var(--r-pill);
  color: var(--accent);
  padding: 14px 26px;
  transition: background 0.25s, color 0.25s;
}

.brings__cta:hover { background: var(--accent-btn); color: var(--on-accent); }

/* ═══ Последнее ═══ */
.rows { border-top: 1px dotted var(--dot); }

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 28px;
  padding: clamp(16px, 2vw, 24px) clamp(4px, 1.2vw, 14px);
  border-bottom: 1px dotted var(--dot);
  transition: background 0.3s;
}

.row:hover { background: var(--accent-dim); }

.row__meta {
  flex: 0 0 auto;
  min-width: 130px;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}

.row__title {
  flex: 1 1 220px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(17px, 1.8vw, 22px);
  letter-spacing: 0.01em;
}

.row__desc {
  flex: 1 1 220px;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-4);
  text-wrap: pretty;
}
</style>
