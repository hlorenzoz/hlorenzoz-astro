import { describe, it, expect } from 'vitest';
import { Globe, MapPin } from '@lucide/astro';
import { renderAstro } from '@/tests/helpers/render';
import ServiceDirectoryList from '@/src/components/services/ServiceDirectoryList.astro';

/**
 * Hrefs here are LOCALE-RELATIVE, not absolute.
 *
 * An earlier version of this component took the fully qualified
 * `absoluteUrl()` string straight from `ContentPage.children()`, so every card
 * on the hub linked to `https://hlorenzoz.com/...`. On localhost that walked
 * the visitor off the dev server and onto production. `children()` still
 * returns absolute URLs because JSON-LD needs them; converting to a relative
 * href is the hub's job.
 */
const items = [
    { name: 'Website Development', href: '/en/services/website-development/', description: 'Fast, modern sites built to convert.', icon: Globe },
    { name: 'Local SEO', href: '/en/services/local-seo/', description: 'Get found by nearby customers.', icon: MapPin },
];

describe('ServiceDirectoryList', () => {
    it('renders one link per item using the given relative href, unchanged', async () => {
        const screen = await renderAstro(ServiceDirectoryList, { items });
        for (const item of items) {
            const link = screen.getByRole('link', { name: new RegExp(item.name) });
            expect(link).toHaveAttribute('href', item.href);
            expect(link).toHaveTextContent(item.description);
        }
    });

    it('renders exactly as many links as items, each with its icon hidden from assistive tech', async () => {
        const screen = await renderAstro(ServiceDirectoryList, { items });
        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(items.length);
        for (const link of links) expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    it('never emits an absolute href, so a hub link cannot leave the current origin', async () => {
        const screen = await renderAstro(ServiceDirectoryList, { items });
        for (const link of screen.getAllByRole('link')) {
            const href = link.getAttribute('href') ?? '';
            expect(href.startsWith('/')).toBe(true);
            expect(href).not.toMatch(/^https?:\/\//);
        }
    });
});
