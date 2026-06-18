import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const branches = sqliteTable('branches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  location: text('location'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: integer('amount').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  branchId: integer('branch_id').references(() => branches.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  description: text('description').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
});

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  branchId: integer('branch_id').references(() => branches.id),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
