import type { PageServerLoad } from './$types';
import { treaty } from '@elysiajs/eden';
import type { App } from '$lib/server/api';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const api = treaty<App>(url.origin, { fetcher: fetch });
	const response = await api.api.branches.get();
	const branches = response.data || [];

	return {
		branches
	};
};
