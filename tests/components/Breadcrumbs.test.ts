import { describe, it, expect } from 'vitest';
import { within } from '@testing-library/dom';
import { renderAstro } from '@/tests/helpers/render';
import Breadcrumbs from '@/src/components/Breadcrumbs.astro';

const CRUMBS = [
    { name: 'Home', url: 'https://hlorenzoz.com/en/' },
    { name: 'Portfolio', url: 'https://hlorenzoz.com/en/portfolio/' },
    { name: 'Masajes Orisha', url: 'https://hlorenzoz.com/en/portfolio/masajes-orisha/' },
];

describe('Breadcrumbs', () => {
    it('is a labelled nav holding an ordered list of every crumb, in order', async () => {
        const screen = await renderAstro(Breadcrumbs, { crumbs: CRUMBS, label: 'Breadcrumb' });
        const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
        const items = within(nav).getAllByRole('listitem');
        expect(nav.querySelector('ol')).not.toBeNull();
        expect(items.map((li) => li.textContent?.trim())).toEqual(['Home', 'Portfolio', 'Masajes Orisha']);
    });

    it('links every crumb but the last, with site-relative paths that keep the trailing slash', async () => {
        const screen = await renderAstro(Breadcrumbs, { crumbs: CRUMBS, label: 'Breadcrumb' });
        const links = within(screen.getByRole('navigation')).getAllByRole('link');
        expect(links.map((a) => a.textContent?.trim())).toEqual(['Home', 'Portfolio']);
        expect(links.map((a) => a.getAttribute('href'))).toEqual(['/en/', '/en/portfolio/']);
    });

    it('renders the last crumb as plain text marked as the current page', async () => {
        const screen = await renderAstro(Breadcrumbs, { crumbs: CRUMBS, label: 'Breadcrumb' });
        const current = screen.getByText('Masajes Orisha');
        expect(current.tagName).not.toBe('A');
        expect(current).toHaveAttribute('aria-current', 'page');
        expect(screen.body.querySelectorAll('[aria-current]')).toHaveLength(1);
    });

    it('hides the separators from assistive technology', async () => {
        const { body } = await renderAstro(Breadcrumbs, { crumbs: CRUMBS, label: 'Breadcrumb' });
        const separators = body.querySelectorAll('svg');
        expect(separators).toHaveLength(CRUMBS.length - 1);
        for (const s of separators) expect(s).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies the container classes to the nav', async () => {
        const screen = await renderAstro(Breadcrumbs, { crumbs: CRUMBS, label: 'Breadcrumb', className: 'max-w-7xl mx-auto' });
        expect(screen.getByRole('navigation')).toHaveClass('max-w-7xl', 'mx-auto');
    });
});
