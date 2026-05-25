import { Elysia, t } from 'elysia';
import { getDb } from '../db';
import { transactions, categories, branches, users, sessions } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

// Pass env from SvelteKit to Elysia using state
export const app = new Elysia({ aot: false, prefix: '/api' })
  .state('env', {} as any)
  .derive(({ store }) => ({ db: getDb(store.env) }))
  .onRequest(({ request, set }) => {
    // CSRF Protection
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfHeader = request.headers.get('x-csrf-token');
      const cookieHeader = request.headers.get('cookie') || '';
      const csrfCookie = cookieHeader.split('; ').find(row => row.startsWith('csrf_token='))?.split('=')[1];
      
      if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        set.status = 403;
        return 'CSRF token mismatch';
      }
    }
  })
  .derive(async ({ request, db }) => {
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionId = cookieHeader.split('; ').find(row => row.startsWith('session_id='))?.split('=')[1];
    let user = null;
    if (sessionId) {
      const result = await db.select({
        session: sessions,
        user: users
      }).from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.id, sessionId))
        .get();
      if (result && new Date(result.session.expiresAt) > new Date()) {
        user = result.user;
      }
    }
    return { user };
  })
  .post('/auth/login', async ({ db, body, set }) => {
    const { username, password } = body;
    
    // Hash password with SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const user = await db.select().from(users).where(eq(users.username, username)).get();
    
    if (user && user.passwordHash === hashHex) {
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1); // 1 day

      await db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        expiresAt
      });

      // We don't set the cookie here because Elysia within SvelteKit might have trouble setting cookies reliably in some environments without the cookie plugin.
      // Instead we return the session ID and SvelteKit sets it.
      return { success: true, sessionId };
    }
    
    set.status = 401;
    return { success: false, error: 'Kredensial tidak valid' };
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String()
    })
  })
  .post('/auth/logout', async ({ db, body }) => {
    if (body.sessionId) {
      await db.delete(sessions).where(eq(sessions.id, body.sessionId));
    }
    return { success: true };
  }, {
    body: t.Object({
      sessionId: t.String()
    })
  })
  .post('/auth/change-password', async ({ db, body, user, set }) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }
    
    const { oldPassword, newPassword } = body;
    
    // Hash old password to verify
    const encoder = new TextEncoder();
    const oldData = encoder.encode(oldPassword);
    const oldHashBuffer = await crypto.subtle.digest('SHA-256', oldData);
    const oldHashHex = Array.from(new Uint8Array(oldHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Check if old password matches
    if (user.passwordHash !== oldHashHex) {
      set.status = 400;
      return { success: false, error: 'Password lama salah' };
    }
    
    // Hash new password
    const newData = encoder.encode(newPassword);
    const newHashBuffer = await crypto.subtle.digest('SHA-256', newData);
    const newHashHex = Array.from(new Uint8Array(newHashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Update user
    await db.update(users).set({ passwordHash: newHashHex }).where(eq(users.id, user.id));
    
    // Invalidate all active sessions for this user so they have to login again (security best practice)
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    
    return { success: true };
  }, {
    body: t.Object({
      oldPassword: t.String(),
      newPassword: t.String()
    })
  })
  .get('/transactions', async ({ db, user, set }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    if (user.branchId !== null) {
      return await db.select().from(transactions).where(eq(transactions.branchId, user.branchId)).orderBy(desc(transactions.date));
    }
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  })
  .post('/transactions', async ({ db, body, user, set }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    if (user.branchId !== null && body.branchId !== user.branchId) {
      set.status = 403; return 'Forbidden: Cannot create transaction for another branch';
    }
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
  .delete('/transactions/:id', async ({ db, params, user, set }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    if (user.branchId !== null) {
      const tx = await db.select().from(transactions).where(eq(transactions.id, Number(params.id))).get();
      if (!tx || tx.branchId !== user.branchId) {
        set.status = 403; return 'Forbidden';
      }
    }
    await db.delete(transactions).where(eq(transactions.id, Number(params.id)));
    return { success: true };
  })
  .get('/branches', async ({ db, user, set }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    if (user.branchId !== null) {
      return await db.select().from(branches).where(eq(branches.id, user.branchId));
    }
    return await db.select().from(branches);
  })
  .post('/branches', async ({ db, body, user, set }) => {
    if (!user || user.branchId !== null) { set.status = 403; return 'Forbidden'; }
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
  .delete('/branches/:id', async ({ db, params, user, set }) => {
    if (!user || user.branchId !== null) { set.status = 403; return 'Forbidden'; }
    try {
      await db.delete(branches).where(eq(branches.id, Number(params.id)));
      return { success: true };
    } catch (e: any) {
      console.error("DB DELETE ERROR:", e);
      return new Response("Tidak dapat menghapus cabang (kemungkinan ada transaksi terkait).", { status: 400 });
    }
  })
  .get('/categories', async ({ db, user, set }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    return await db.select().from(categories);
  });

export type App = typeof app;
