import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceDirectoryList } from '@/components/services/ServiceDirectoryList';

/**
 * Hrefs here are LOCALE-RELATIVE, not absolute.
 *
 * An earlier version of this component took the fully qualified
 * `absoluteUrl()` string straight from `ContentPage.children()`, so every card
 * on the hub linked to `https://hlorenzoz.com/...`. On localhost that walked
 * the visitor off the dev server and onto production, and on any preview
 * deploy it would do the same. `children()` still returns absolute URLs
 * because JSON-LD needs them; converting to a relative href is the hub's job.
 */
const items = [
    {
        name: 'Website Development',
        href: '/en/services/website-development/',
        description: 'Fast, modern sites built to convert.',
        icon: <span data-testid="icon-website">icon</span>,
    },
    {
        name: 'Local SEO',
        href: '/en/services/local-seo/',
        description: 'Get found by nearby customers.',
        icon: <span data-testid="icon-seo">icon</span>,
    },
];

describe('ServiceDirectoryList', () => {
    it('renders one link per item using the given relative href', () => {
        render(<ServiceDirectoryList items={items} />);

        for (const item of items) {
            const link = screen.getByRole('link', { name: new RegExp(item.name) });
            // Compared without the trailing slash: `next/link` strips it under
            // jsdom, while the real build runs with `trailingSlash: true` and
            // emits `/en/services/local-seo/`. Asserting the exact string here
            // would be asserting a jsdom artifact, so the path is compared on
            // the part both agree about. The built output is what the e2e
            // suite checks.
            const expected = item.href.replace(/\/$/, '');
            expect(link.getAttribute('href')?.replace(/\/$/, '')).toBe(expected);
            expect(link).toHaveTextContent(item.description);
        }
    });

    it('renders exactly as many links as items', () => {
        render(<ServiceDirectoryList items={items} />);
        expect(screen.getAllByRole('link')).toHaveLength(items.length);
    });

    it('never emits an absolute href, so a hub link cannot leave the current origin', () => {
        render(<ServiceDirectoryList items={items} />);

        for (const link of screen.getAllByRole('link')) {
            const href = link.getAttribute('href') ?? '';
            expect(href.startsWith('/')).toBe(true);
            expect(href).not.toMatch(/^https?:\/\//);
        }
    });
});
