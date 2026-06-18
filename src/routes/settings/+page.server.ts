import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { getApi } from '$lib/api';

export const load: PageServerLoad = async ({ locals, url, fetch, request }) => {
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    
    let apiKeys: any[] = [];
    if (locals.user.branchId === null) {
        const cookieString = request.headers.get('cookie') || '';
        const api = getApi(url.origin, locals.csrfToken, cookieString, fetch);
        const { data } = await api.api.keys.get();
        if (data && !('error' in data)) {
            apiKeys = data as any[];
        }
    }
    
    return {
        user: locals.user,
        apiKeys
    };
};

export const actions = {
    changePassword: async ({ request, url, locals, cookies, fetch }) => {
        if (!locals.user) throw redirect(302, '/login');

        const data = await request.formData();
        const oldPassword = data.get('oldPassword')?.toString();
        const newPassword = data.get('newPassword')?.toString();
        const confirmPassword = data.get('confirmPassword')?.toString();

        if (!oldPassword || !newPassword || !confirmPassword) {
            return fail(400, { error: 'Semua kolom wajib diisi' });
        }

        if (newPassword !== confirmPassword) {
            return fail(400, { error: 'Konfirmasi password baru tidak cocok' });
        }

        const cookieString = request.headers.get('cookie') || '';
        const api = getApi(url.origin, locals.csrfToken, cookieString, fetch);
        const { data: res, error } = await api.api.auth['change-password'].post({
            oldPassword,
            newPassword
        });

        if (error || !res?.success) {
            return fail(400, { error: res?.error || 'Gagal mengubah password' });
        }

        // On success, the API deleted all sessions for this user.
        // So we delete the session cookie on the client too.
        cookies.delete('session_id', { path: '/' });

        // Redirect to login with a success parameter
        throw redirect(303, '/login?passwordChanged=true');
    }
} satisfies Actions;
