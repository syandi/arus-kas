// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Env {
		DB: D1Database;
	}
	namespace App {
		interface Locals {
			csrfToken: string;
			user?: { id: number; branchId: number | null };
		}
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
