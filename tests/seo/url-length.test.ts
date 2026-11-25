/**
 * Every indexable URL stays at 60 characters or fewer, scheme and domain included.
 * Short, readable URLs are the common SEO recommendation, and a long slug cannot be
 * shortened later without a redirect (see the masajes-orisha rule in public/_redirects).
 */
import { describe, it, expect } from 'vitest';
import { sitemap } from '@/src/pages/sitemap.xml';

describe('URL length', () => {
    it('keeps every sitemap URL at 60 characters or fewer', () => {
        const long = sitemap()
            .map((entry) => entry.url)
            .filter((url) => url.length > 60)
            .map((url) => `${url.length} ${url}`);
        expect(long).toEqual([]);
    });
});
