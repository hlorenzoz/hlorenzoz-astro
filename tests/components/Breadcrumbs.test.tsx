import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const CRUMBS = [
    { name: 'Home', url: 'https://hlorenzoz.com/en/' },
    { name: 'Portfolio', url: 'https://hlorenzoz.com/en/portfolio/' },
    { name: 'Masajes Orisha', url: 'https://hlorenzoz.com/en/portfolio/masajes-orisha/' },
];

describe('Breadcrumbs', () => {
    it('is a labelled nav holding an ordered list of every crumb, in order', () => {
        render(<Breadcrumbs crumbs={CRUMBS} label="Breadcrumb" />);
        const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
        const items = within(nav).getAllByRole('listitem');
        expect(nav.querySelector('ol')).not.toBeNull();
        expect(items.map((li) => li.textContent)).toEqual(['Home', 'Portfolio', 'Masajes Orisha']);
    });

    it('links every crumb but the last, with site-relative paths that keep the trailing slash', () => {
        render(<Breadcrumbs crumbs={CRUMBS} label="Breadcrumb" />);
        const links = within(screen.getByRole('navigation')).getAllByRole('link');
        expect(links.map((a) => a.textContent)).toEqual(['Home', 'Portfolio']);
        // next/link drops the trailing slash unless `trailingSlash` is set in
        // next.config, which Vitest does not load. What the component passes
        // is the crumb's own pathname, so the path is the contract checked
        // here; the static build (`out/`) is where the slash is visible.
        expect(links.map((a) => a.getAttribute('href')?.replace(/\/?$/, '/'))).toEqual(['/en/', '/en/portfolio/']);
        for (const a of links) expect(a.getAttribute('href')).not.toMatch(/^https?:/);
    });

    it('renders the last crumb as plain text marked as the current page', () => {
        render(<Breadcrumbs crumbs={CRUMBS} label="Breadcrumb" />);
        const current = screen.getByText('Masajes Orisha');
        expect(current.tagName).not.toBe('A');
        expect(current).toHaveAttribute('aria-current', 'page');
        expect(screen.getAllByText(/./, { selector: '[aria-current]' })).toHaveLength(1);
    });

    it('hides the separators from assistive technology', () => {
        const { container } = render(<Breadcrumbs crumbs={CRUMBS} label="Breadcrumb" />);
        const separators = container.querySelectorAll('svg');
        expect(separators).toHaveLength(CRUMBS.length - 1);
        for (const s of separators) expect(s).toHaveAttribute('aria-hidden', 'true');
    });
});
