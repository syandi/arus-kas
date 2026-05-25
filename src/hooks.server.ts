import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
  // 1. CSRF Token Generation
  let csrfToken = event.cookies.get('csrf_token');
  if (!csrfToken) {
    csrfToken = crypto.randomUUID();
    event.cookies.set('csrf_token', csrfToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 1 day
    });
  }
  event.locals.csrfToken = csrfToken;

  // 2. Authentication Check
  const sessionId = event.cookies.get('session_id');
  if (sessionId) {
    const db = getDb(event.platform?.env as Env);
    const result = await db.select({
      session: sessions,
      user: users
    }).from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionId))
      .get();
    
    if (result && new Date(result.session.expiresAt) > new Date()) {
      event.locals.user = { id: result.user.id, branchId: result.user.branchId, username: result.user.username };
    } else if (result) {
      // Expired
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      event.cookies.delete('session_id', { path: '/' });
    }
  }

  // 3. Route Protection
  const path = event.url.pathname;
  const isAuthRoute = path === '/login' || path === '/api/auth/login';
  
  if (!event.locals.user && !isAuthRoute) {
    // If it's an API route and not authenticated, return 401
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    // Otherwise redirect to login
    return new Response('Redirect', {
      status: 303,
      headers: { Location: '/login' }
    });
  }

  if (event.locals.user && path === '/login') {
    return new Response('Redirect', {
      status: 303,
      headers: { Location: '/' }
    });
  }

  // Restrict /branches for non-superadmin
  if (event.locals.user && event.locals.user.branchId !== null && path.startsWith('/branches')) {
    return new Response('Redirect', {
      status: 303,
      headers: { Location: '/' }
    });
  }

  const response = await resolve(event);
  return response;
};
