import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(0),
  updated: integer('updated').notNull(),
}, table => [index('rooms_updated_idx').on(table.updated)]);
