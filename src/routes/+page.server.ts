import type { PageServerLoad } from './$types';
import { treaty } from '@elysiajs/eden';
import type { App } from '$lib/server/api';

export const load: PageServerLoad = async ({ fetch, url }) => {
	// Treat the local API
	const api = treaty<App>(url.origin, { fetcher: fetch });
	
	const response = await api.api.transactions.get();
	const branchesResponse = await api.api.branches.get();
	const categoriesResponse = await api.api.categories.get();
	
	const transactions = response.data || [];
	const branches = branchesResponse.data || [];
	const categories = categoriesResponse.data || [];

	return {
		transactions,
		branches,
		categories
	};
};
