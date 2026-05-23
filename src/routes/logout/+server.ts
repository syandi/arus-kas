import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { getApi } from '$lib/api';

export const POST: RequestHandler = async ({ locals, cookies, request, url, fetch }) => {
    const sessionId = cookies.get('session_id');
    if (sessionId) {
        const cookieString = request.headers.get('cookie') || '';
        const api = getApi(url.origin, locals.csrfToken, cookieString, fetch);
        await api.api.auth.logout.post({ sessionId });
        cookies.delete('session_id', { path: '/' });
    }
    throw redirect(303, '/login');
};
