export type Locale = 'ru' | 'en'

export interface Tag {
  id: number
  slug: string
  name: string
}

export interface PostImage {
  id: number
  url: string
  alt: string
  position: number
}

/** A post as lists return it: everything but the body. */
export interface PostSummary {
  id: number
  slug: string
  type: 'blog' | 'project'
  title: string
  excerpt: string
  url: string | null
  tags: Tag[]
  images: PostImage[]
  published_at: string | null
  updated_at: string
}

export interface Post extends PostSummary {
  text: string
}

export interface AboutMe {
  id: number
  text: string
}

export interface ExperienceBullet {
  id: number
  text: string
  order: number
}

export interface Experience {
  id: number
  company: string
  position: string
  date_from: string
  date_to: string | null
  order: number
  bullets: ExperienceBullet[]
}

export interface Education {
  id: number
  institution: string
  specialization: string
  date_from: string
  date_to: string | null
  order: number
}

export interface Skill {
  id: number
  name: string
  order: number
}

export interface SkillGroup {
  id: number
  slug: string
  name: string
  skills: Skill[]
}
