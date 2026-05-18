import { Elysia, t } from 'elysia';
import { getDb } from '../db';
import { transactions, categories } from '../db/schema';
import { desc } from 'drizzle-orm';

// Pass env from SvelteKit to Elysia using state
export const app = new Elysia({ prefix: '/api' })
  .state('env', {} as any)
  .derive(({ store }) => {
    return {
      db: getDb(store.env)
    };
  })
  .get('/transactions', async ({ db }) => {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  })
  .post('/transactions', async ({ db, body }) => {
    const result = await db.insert(transactions).values({
      ...body,
      date: new Date(body.date)
    }).returning();
    return result[0];
  }, {
    body: t.Object({
      amount: t.Number(),
      type: t.Union([t.Literal('income'), t.Literal('expense')]),
      categoryId: t.Number(),
      description: t.String(),
      date: t.String()
    })
  });

export type App = typeof app;
