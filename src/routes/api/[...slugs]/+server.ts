import { app } from '$lib/server/api';
import type { RequestHandler } from '@sveltejs/kit';

export const fallback: RequestHandler = ({ request, platform }) => {
  // Inject Cloudflare env into Elysia store
  const elysiaApp = app.state('env', platform?.env ?? {});
  return elysiaApp.handle(request);
};
