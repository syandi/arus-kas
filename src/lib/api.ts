import { treaty } from '@elysiajs/eden';
import type { App } from './server/api';

export const getApi = (origin: string, csrfToken: string, cookieString?: string, customFetch?: typeof fetch) => {
    return treaty<App>(origin, {
        fetcher: customFetch,
        headers: {
            'X-CSRF-Token': csrfToken,
            ...(cookieString ? { 'Cookie': cookieString } : {})
        }
    });
};
