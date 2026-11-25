import { describe, it, expect } from 'vitest';
import { createTechLinker, TECH_LINKS } from '@/lib/tech-links';

describe('createTechLinker', () => {
    it('links the first mention of each technology on the page, once per site', () => {
        const link = createTechLinker();
        expect(link('Built with Astro and Tailwind CSS on Cloudflare.')).toEqual([
            'Built with ',
            { text: 'Astro', href: 'https://astro.build/' },
            ' and ',
            { text: 'Tailwind CSS', href: 'https://tailwindcss.com/' },
            ' on ',
            { text: 'Cloudflare', href: 'https://www.cloudflare.com/' },
            '.',
        ]);
        // Later mentions, and other names for an already linked site, stay plain text.
        expect(link('Astro again, Tailwind again, Cloudflare Workers.')).toEqual(['Astro again, Tailwind again, Cloudflare Workers.']);
    });

    it('matches whole names only and prefers the longer one', () => {
        const link = createTechLinker();
        expect(link('SvelteKit, not Svelte.')).toEqual([
            { text: 'SvelteKit', href: 'https://svelte.dev/docs/kit/introduction' },
            ', not Svelte.',
        ]);
        expect(link('Astronomy and Reactive are not technologies here.')).toEqual(['Astronomy and Reactive are not technologies here.']);
    });

    it('keeps the text intact when nothing matches', () => {
        expect(createTechLinker()('Plain sentence.')).toEqual(['Plain sentence.']);
    });

    it('only points at https official sites', () => {
        for (const { url } of TECH_LINKS) expect(url).toMatch(/^https:\/\//);
    });
});
