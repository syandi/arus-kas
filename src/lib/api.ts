import { treaty } from '@elysiajs/eden';
import type { App } from './server/api';

export const getApi = (origin: string, csrfToken: string, cookieString?: string) => {
    return treaty<App>(origin, {
        headers: {
            'X-CSRF-Token': csrfToken,
            ...(cookieString ? { 'Cookie': cookieString } : {})
        }
    });
};
