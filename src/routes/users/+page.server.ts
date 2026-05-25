import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { treaty } from '@elysiajs/eden';
import type { App } from '$lib/server/api';

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
	if (!locals.user || locals.user.branchId !== null) {
		throw redirect(302, '/');
	}

	const api = treaty<App>(url.origin, { fetcher: fetch });
	
	const usersResponse = await api.api.users.get();
	const branchesResponse = await api.api.branches.get();
	
	const usersList = usersResponse.data || [];
	const branches = branchesResponse.data || [];

	return {
		usersList,
		branches
	};
};
