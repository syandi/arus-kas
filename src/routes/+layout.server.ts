import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		csrfToken: locals.csrfToken,
        user: locals.user
	};
};
