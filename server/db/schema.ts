import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('User', {
  id:       serial('id').primaryKey(),
  email:    varchar('email', { length: 255 }).notNull().unique(),
  name:     varchar('name', { length: 255 }),
  password: varchar('password', { length: 255 }),
  date:     timestamp('date', { mode: 'string' }),
})

export const products = pgTable('Products', {
  id:         serial('id').primaryKey(),
  type:       varchar('type', { length: 50 }).notNull(),
  title:      varchar('title', { length: 500 }).notNull(),
  text:       text('text').notNull(),
  text_short: text('text_short').notNull(),
  author:     varchar('author', { length: 255 }),
  url:        varchar('url', { length: 1000 }),
  date:       timestamp('date', { mode: 'string' }).notNull(),
})

export const tags = pgTable('Tags', {
  id:         serial('id').primaryKey(),
  product_id: integer('product_id'),
  name:       varchar('name', { length: 255 }).notNull(),
  date:       timestamp('date', { mode: 'string' }).notNull(),
})

export const images = pgTable('Images', {
  id:         serial('id').primaryKey(),
  product_id: integer('product_id'),
  url:        varchar('url', { length: 1000 }),
  alt:        varchar('alt', { length: 500 }),
  date:       timestamp('date', { mode: 'string' }).notNull(),
})

export const aboutMe = pgTable('AboutMe', {
  id:   serial('id').primaryKey(),
  text: text('text').notNull(),
  date: timestamp('date', { mode: 'string' }).notNull(),
})

export const inform = pgTable('Inform', {
  id:         serial('id').primaryKey(),
  title:      varchar('title', { length: 500 }).notNull(),
  type:       varchar('type', { length: 50 }).notNull(),
  place:      varchar('place', { length: 500 }).notNull(),
  dateString: varchar('dateString', { length: 100 }).notNull(),
  date:       timestamp('date', { mode: 'string' }).notNull(),
})

export const informDetails = pgTable('InformDetails', {
  id:       serial('id').primaryKey(),
  text:     text('text').notNull(),
  date:     timestamp('date', { mode: 'string' }).notNull(),
  informId: integer('informId'),
})

export const skills = pgTable('Skills', {
  id:          serial('id').primaryKey(),
  languages:   text('languages').notNull(),
  frameworks:  text('frameworks').notNull(),
  cms:         text('cms').notNull(),
  instruments: text('instruments').notNull(),
  date:        timestamp('date', { mode: 'string' }).notNull(),
})

/* ── Relations (для relational query API) ── */

export const productsRelations = relations(products, ({ many }) => ({
  tags:   many(tags),
  images: many(images),
}))

export const tagsRelations = relations(tags, ({ one }) => ({
  product: one(products, { fields: [tags.product_id], references: [products.id] }),
}))

export const imagesRelations = relations(images, ({ one }) => ({
  product: one(products, { fields: [images.product_id], references: [products.id] }),
}))

export const informRelations = relations(inform, ({ many }) => ({
  InformDetails: many(informDetails),
}))

export const informDetailsRelations = relations(informDetails, ({ one }) => ({
  Inform: one(inform, { fields: [informDetails.informId], references: [inform.id] }),
}))
