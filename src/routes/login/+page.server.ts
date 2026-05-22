import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getApi } from '$lib/api';

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) {
        throw redirect(302, '/');
    }
    return {};
};

export const actions = {
    default: async ({ request, url, locals, cookies }) => {
        const data = await request.formData();
        const username = data.get('username')?.toString();
        const password = data.get('password')?.toString();

        if (!username || !password) {
            return fail(400, { error: 'Username dan Password wajib diisi' });
        }

        const cookieString = request.headers.get('cookie') || '';
        const api = getApi(url.origin, locals.csrfToken, cookieString);
        const { data: res, error } = await api.api.auth.login.post({
            username,
            password
        });

        if (error || !res?.success || !res?.sessionId) {
            return fail(401, { error: res?.error || 'Gagal login' });
        }

        cookies.set('session_id', res.sessionId, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24
        });

        throw redirect(303, '/');
    }
} satisfies Actions;
