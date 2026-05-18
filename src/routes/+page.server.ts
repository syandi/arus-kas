import type { PageServerLoad } from './$types';
import { treaty } from '@elysiajs/eden';
import type { App } from '$lib/server/api';

export const load: PageServerLoad = async ({ fetch, url }) => {
	// Treat the local API
	const api = treaty<App>(url.origin, { fetcher: fetch });
	
	const response = await api.api.transactions.get();
	console.log("Elysia GET Response:", response.data, "Error:", response.error);
	const transactions = response.data || [];

	return {
		transactions
	};
};
