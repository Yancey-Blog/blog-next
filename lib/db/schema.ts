import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
})

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
  },
  (table) => [index('session_userId_idx').on(table.userId)]
)

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index('account_userId_idx').on(table.userId)]
)

export const verifications = pgTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
)

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts)
}))

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}))

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}))

export const blogs = pgTable('blogs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary').notNull(),
  coverImage: text('cover_image').notNull(),
  published: boolean('published').default(false).notNull(),
  tags: text('tags').array().default([]).notNull(), // Array of tags
  like: integer('like').default(0).notNull(), // Like count
  pv: integer('pv').default(0).notNull(), // Page view count
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

// Blog version history table
export const blogVersions = pgTable('blog_versions', {
  id: text('id').primaryKey(),
  blogId: text('blog_id')
    .notNull()
    .references(() => blogs.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  summary: text('summary'),
  coverImage: text('cover_image'),
  changedBy: text('changed_by')
    .notNull()
    .references(() => users.id),
  changeNote: text('change_note'), // Version change note
  createdAt: timestamp('created_at').defaultNow().notNull()
})

// Settings table for storing app-wide configuration
export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(), // Setting key (e.g., 'theme', 'siteName')
  value: text('value').notNull(), // JSON string value
  description: text('description'), // Optional description
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()
})

export type User = typeof users.$inferSelect
export type InsertUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type InsertSession = typeof sessions.$inferInsert
export type Blog = typeof blogs.$inferSelect
export type InsertBlog = typeof blogs.$inferInsert
export type BlogVersion = typeof blogVersions.$inferSelect
export type InsertBlogVersion = typeof blogVersions.$inferInsert
export type Setting = typeof settings.$inferSelect
export type InsertSetting = typeof settings.$inferInsert
