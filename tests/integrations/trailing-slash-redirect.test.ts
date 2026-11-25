import { describe, it, expect } from 'vitest';
import { redirectTarget } from '@/src/integrations/trailing-slash-redirect.mjs';

describe('dev trailing-slash redirect (mirrors the Worker auto-trailing-slash)', () => {
    it.each([
        ['/en', '/en/'],
        ['/es/services', '/es/services/'],
        ['/en/services?x=1', '/en/services/?x=1'],
    ])('redirects %s to %s', (url, target) => {
        expect(redirectTarget(url)).toBe(target);
    });

    it.each(['/', '/en/', '/en/services/?x=1', '/sitemap.xml', '/icons/icon.svg', '/_astro/page.js', '/@vite/client', '/@fs/x/y', '/@id/astro:scripts', '/node_modules/.vite/deps/react.js', '/src/components/Navbar.astro', '/__x00__virtual'])(
        'leaves %s alone',
        (url) => {
            expect(redirectTarget(url)).toBeNull();
        }
    );
});
