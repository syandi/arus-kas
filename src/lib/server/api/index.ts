import { Elysia, t } from 'elysia';
import { getDb } from '../db';
import { transactions, categories, branches } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

// Pass env from SvelteKit to Elysia using state
export const app = new Elysia({ prefix: '/api' })
  .state('env', {} as any)
  .derive(({ store }) => ({ db: getDb(store.env) }))
  .get('/transactions', async ({ db }) => {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  })
  .post('/transactions', async ({ db, body }) => {
    await db.insert(transactions).values({
      ...body,
      date: new Date(body.date)
    });
    return { success: true };
  }, {
    body: t.Object({
      amount: t.Number(),
      type: t.Union([t.Literal('income'), t.Literal('expense')]),
      categoryId: t.Number(),
      branchId: t.Number(),
      description: t.String(),
      date: t.String()
    })
  })
  .delete('/transactions/:id', async ({ db, params }) => {
    await db.delete(transactions).where(eq(transactions.id, Number(params.id)));
    return { success: true };
  })
  .get('/branches', async ({ db }) => {
    return await db.select().from(branches);
  })
  .post('/branches', async ({ db, body }) => {
    try {
      await db.insert(branches).values({
        ...body,
        createdAt: new Date()
      });
      return { success: true };
    } catch (e: any) {
      console.error("DB INSERT ERROR:", e);
      return new Response(e.cause?.message || e.message, { status: 500 });
    }
  }, {
    body: t.Object({
      name: t.String(),
      location: t.Optional(t.String())
    })
  })
  .delete('/branches/:id', async ({ db, params }) => {
    try {
      await db.delete(branches).where(eq(branches.id, Number(params.id)));
      return { success: true };
    } catch (e: any) {
      console.error("DB DELETE ERROR:", e);
      return new Response("Tidak dapat menghapus cabang (kemungkinan ada transaksi terkait).", { status: 400 });
    }
  });

export type App = typeof app;
