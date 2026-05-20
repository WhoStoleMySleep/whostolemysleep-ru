import {
  pgTable, pgEnum, serial, varchar, text, integer,
  timestamp, boolean, date, primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/* ── Enums ── */

export const postTypeEnum  = pgEnum('post_type',  ['blog', 'project'])
export const userRoleEnum  = pgEnum('user_role',  ['admin', 'viewer'])

/* ── Content ── */

export const post = pgTable('post', {
  id:           serial('id').primaryKey(),
  slug:         varchar('slug', { length: 255 }).notNull().unique(),
  type:         postTypeEnum('type').notNull(),
  title_ru:     varchar('title_ru', { length: 500 }).notNull(),
  title_en:     varchar('title_en', { length: 500 }).notNull().default(''),
  text_ru:      text('text_ru').notNull(),
  text_en:      text('text_en').notNull().default(''),
  excerpt_ru:   text('excerpt_ru').notNull(),
  excerpt_en:   text('excerpt_en').notNull().default(''),
  url:          varchar('url', { length: 1000 }),
  is_published: boolean('is_published').notNull().default(false),
  published_at: timestamp('published_at', { mode: 'string' }),
  created_at:   timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updated_at:   timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
})

export const tag = pgTable('tag', {
  id:      serial('id').primaryKey(),
  slug:    varchar('slug', { length: 100 }).notNull().unique(),
  name_ru: varchar('name_ru', { length: 100 }).notNull(),
  name_en: varchar('name_en', { length: 100 }).notNull().default(''),
})

export const postTag = pgTable('post_tag', {
  post_id: integer('post_id').notNull().references(() => post.id, { onDelete: 'cascade' }),
  tag_id:  integer('tag_id').notNull().references(() => tag.id,  { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.post_id, t.tag_id] })])

export const image = pgTable('image', {
  id:       serial('id').primaryKey(),
  post_id:  integer('post_id').notNull().references(() => post.id, { onDelete: 'cascade' }),
  url:      varchar('url', { length: 1000 }).notNull(),
  alt_ru:   varchar('alt_ru', { length: 500 }).notNull().default(''),
  alt_en:   varchar('alt_en', { length: 500 }).notNull().default(''),
  position: integer('position').notNull().default(0),
})

/* ── About ── */

export const aboutMe = pgTable('about_me', {
  id:         serial('id').primaryKey(),
  text_ru:    text('text_ru').notNull(),
  text_en:    text('text_en').notNull().default(''),
  updated_at: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
})

/* ── Resume ── */

export const experience = pgTable('experience', {
  id:          serial('id').primaryKey(),
  company:     varchar('company', { length: 255 }).notNull(),
  position_ru: varchar('position_ru', { length: 255 }).notNull(),
  position_en: varchar('position_en', { length: 255 }).notNull().default(''),
  date_from:   date('date_from').notNull(),
  date_to:     date('date_to'),
  order:       integer('order').notNull().default(0),
})

export const experienceBullet = pgTable('experience_bullet', {
  id:            serial('id').primaryKey(),
  experience_id: integer('experience_id').notNull().references(() => experience.id, { onDelete: 'cascade' }),
  text_ru:       text('text_ru').notNull(),
  text_en:       text('text_en').notNull().default(''),
  order:         integer('order').notNull().default(0),
})

export const education = pgTable('education', {
  id:                serial('id').primaryKey(),
  institution:       varchar('institution', { length: 255 }).notNull(),
  specialization_ru: varchar('specialization_ru', { length: 255 }).notNull(),
  specialization_en: varchar('specialization_en', { length: 255 }).notNull().default(''),
  date_from:         date('date_from').notNull(),
  date_to:           date('date_to'),
  order:             integer('order').notNull().default(0),
})

/* ── Skills ── */

export const skillGroup = pgTable('skill_group', {
  id:      serial('id').primaryKey(),
  slug:    varchar('slug', { length: 100 }).notNull().unique(),
  name_ru: varchar('name_ru', { length: 100 }).notNull(),
  name_en: varchar('name_en', { length: 100 }).notNull().default(''),
  order:   integer('order').notNull().default(0),
})

export const skill = pgTable('skill', {
  id:       serial('id').primaryKey(),
  group_id: integer('group_id').notNull().references(() => skillGroup.id, { onDelete: 'cascade' }),
  name:     varchar('name', { length: 100 }).notNull(),
  order:    integer('order').notNull().default(0),
})

/* ── Auth ── */

export const user = pgTable('user', {
  id:            serial('id').primaryKey(),
  email:         varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role:          userRoleEnum('role').notNull().default('admin'),
  created_at:    timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
})

/* ── Relations ── */

export const postRelations = relations(post, ({ many }) => ({
  postTags: many(postTag),
  images:   many(image),
}))

export const tagRelations = relations(tag, ({ many }) => ({
  postTags: many(postTag),
}))

export const postTagRelations = relations(postTag, ({ one }) => ({
  post: one(post, { fields: [postTag.post_id], references: [post.id] }),
  tag:  one(tag,  { fields: [postTag.tag_id],  references: [tag.id] }),
}))

export const imageRelations = relations(image, ({ one }) => ({
  post: one(post, { fields: [image.post_id], references: [post.id] }),
}))

export const experienceRelations = relations(experience, ({ many }) => ({
  bullets: many(experienceBullet),
}))

export const experienceBulletRelations = relations(experienceBullet, ({ one }) => ({
  experience: one(experience, { fields: [experienceBullet.experience_id], references: [experience.id] }),
}))

export const skillGroupRelations = relations(skillGroup, ({ many }) => ({
  skills: many(skill),
}))

export const skillRelations = relations(skill, ({ one }) => ({
  group: one(skillGroup, { fields: [skill.group_id], references: [skillGroup.id] }),
}))
