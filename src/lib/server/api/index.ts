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
    const query = db.select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      categoryId: transactions.categoryId,
      branchId: transactions.branchId,
      userId: transactions.userId,
      description: transactions.description,
      date: transactions.date,
      author: users.username
    }).from(transactions).leftJoin(users, eq(transactions.userId, users.id)).orderBy(desc(transactions.date));

    if (user.branchId !== null) {
      return await query.where(eq(transactions.branchId, user.branchId));
    }
    return await query;
  })
  .post('/transactions', async ({ db, body, user, set }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    if (user.branchId !== null && body.branchId !== user.branchId) {
      set.status = 403; return 'Forbidden: Cannot create transaction for another branch';
    }
    await db.insert(transactions).values({
      ...body,
      userId: user.id,
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
  .put('/transactions/:id', async ({ db, params, body, user, set }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    if (user.branchId !== null) {
      const tx = await db.select().from(transactions).where(eq(transactions.id, Number(params.id))).get();
      if (!tx || tx.branchId !== user.branchId) {
        set.status = 403; return 'Forbidden';
      }
      if (body.branchId !== user.branchId) {
        set.status = 403; return 'Forbidden: Cannot move transaction to another branch';
      }
    }
    await db.update(transactions).set({
      ...body,
      date: new Date(body.date)
    }).where(eq(transactions.id, Number(params.id)));
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
  })
  .get('/users', async ({ db, user, set }) => {
    if (!user || user.branchId !== null) { set.status = 403; return 'Forbidden'; }
    // Join users with branches to get branch name
    const result = await db.select({
      id: users.id,
      username: users.username,
      branchId: users.branchId,
      branchName: branches.name,
      branchLocation: branches.location
    })
    .from(users)
    .leftJoin(branches, eq(users.branchId, branches.id));
    return result;
  })
  .post('/users', async ({ db, body, user, set }) => {
    if (!user || user.branchId !== null) { set.status = 403; return 'Forbidden'; }
    try {
      const { username, password, branchId } = body;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      await db.insert(users).values({
        username,
        passwordHash: hashHex,
        branchId: branchId || null
      });
      return { success: true };
    } catch (e: any) {
      console.error("DB INSERT USER ERROR:", e);
      return new Response(e.cause?.message || e.message, { status: 500 });
    }
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
      branchId: t.Optional(t.Union([t.Number(), t.Null()]))
    })
  })
  .delete('/users/:id', async ({ db, params, user, set }) => {
    if (!user || user.branchId !== null) { set.status = 403; return 'Forbidden'; }
    if (user.id === Number(params.id)) {
      set.status = 400;
      return new Response("Tidak dapat menghapus akun diri sendiri.", { status: 400 });
    }
    try {
      // Also delete sessions for this user before deleting the user
      await db.delete(sessions).where(eq(sessions.userId, Number(params.id)));
      await db.delete(users).where(eq(users.id, Number(params.id)));
      return { success: true };
    } catch (e: any) {
      console.error("DB DELETE USER ERROR:", e);
      return new Response("Gagal menghapus pengguna.", { status: 500 });
    }
  })
  .post('/ai/chat', async ({ db, body, user, set, store }) => {
    if (!user) { set.status = 401; return 'Unauthorized'; }
    const env = (store as any).env;
    if (!env || !env.AI) {
      set.status = 500;
      return new Response('AI binding not configured. Please ensure ai binding is setup in wrangler.', { status: 500 });
    }

    let targetBranchId = user.branchId;
    if (user.branchId === null) {
       if (body.branchId) {
         targetBranchId = Number(body.branchId);
       }
    } else {
       if (body.branchId && Number(body.branchId) !== user.branchId) {
          set.status = 403; return 'Forbidden';
       }
    }

    let txs;
    if (targetBranchId !== null) {
      txs = await db.select({
        amount: transactions.amount,
        type: transactions.type,
        category: categories.name,
        description: transactions.description,
        date: transactions.date
      }).from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(eq(transactions.branchId, targetBranchId))
        .orderBy(desc(transactions.date))
        .limit(50);
    } else {
      txs = await db.select({
        amount: transactions.amount,
        type: transactions.type,
        category: categories.name,
        description: transactions.description,
        date: transactions.date
      }).from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .orderBy(desc(transactions.date))
        .limit(50);
    }

    let contextPrompt = 'Kamu adalah asisten analis keuangan AI pintar (bernama ArusKas AI). Jawablah pertanyaan user dengan santai, jelas, dan profesional menggunakan bahasa Indonesia.';
    if (txs.length > 0) {
      let totalIncome = 0;
      let totalExpense = 0;
      const txStrings = txs.map(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
        const dateStr = new Date(t.date).toLocaleDateString('id-ID');
        return `[${dateStr}] ${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} Rp${t.amount} (${t.category}): ${t.description}`;
      }).join('\n');

      contextPrompt += `\n\nSebagai konteks, berikut adalah ringkasan saldo saat ini berdasarkan 50 transaksi terakhir cabang ini:
Total Pemasukan: Rp${totalIncome}
Total Pengeluaran: Rp${totalExpense}

Daftar Transaksi Terakhir:
${txStrings}

Gunakan data di atas untuk menjawab pertanyaan user jika relevan. Jika ditanya tentang prediksi, perhitungan, atau saran, berikan analisis berdasarkan angka tersebut.`;
    }

    const aiMessages = [
      { role: 'system', content: contextPrompt },
      ...body.messages
    ];

    try {
      const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: aiMessages
      });
      return { response: result.response };
    } catch (e: any) {
      console.error("AI ERROR:", e);
      set.status = 500;
      return new Response('Gagal memproses AI: ' + (e.message || 'Unknown error'), { status: 500 });
    }
  }, {
    body: t.Object({
      branchId: t.Optional(t.String()),
      messages: t.Array(t.Object({
        role: t.String(),
        content: t.String()
      }))
    })
  });

export type App = typeof app;
