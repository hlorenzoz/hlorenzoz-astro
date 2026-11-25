import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NewsCarousel } from '@/components/NewsCarousel';

const ITEMS = [
    { slug: 'post-b', title: 'Post B', image: 'https://cdn.hlorenzoz.com/b.webp', datePublished: '2026-11-24' },
    { slug: 'post-a', title: 'Post A', image: 'https://cdn.hlorenzoz.com/a.webp', datePublished: '2026-10-01' },
];
const COPY = { eyebrow: 'NEWS', title: 'Latest News', subtitle: 'sub', viewAll: 'See all news' };

describe('NewsCarousel', () => {
    it('renders one linked card per post, in order, with a dated time element', () => {
        const { container } = render(<NewsCarousel locale="en" items={ITEMS} {...COPY} />);
        const cards = [...container.querySelectorAll('#news li a')];
        expect(cards.map((a) => a.getAttribute('href'))).toEqual(['/en/news/post-b', '/en/news/post-a']);
        expect(container.querySelector('#news li time')?.getAttribute('datetime')).toBe('2026-11-24');
        expect(screen.getByRole('heading', { level: 2, name: 'Latest News' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Post B', 'Post A']);
    });

    it('links the news index', () => {
        render(<NewsCarousel locale="es" items={ITEMS} {...COPY} />);
        expect(screen.getByRole('link', { name: /See all news/ })).toHaveAttribute('href', '/es/news');
    });

    it('makes the scroll strip keyboard-focusable', () => {
        const { container } = render(<NewsCarousel locale="en" items={ITEMS} {...COPY} />);
        const strip = container.querySelector('#news ul');
        expect(strip).toHaveAttribute('tabindex', '0');
        expect(strip).toHaveAttribute('aria-label', 'Latest News');
    });

    it('renders nothing without posts', () => {
        const { container } = render(<NewsCarousel locale="en" items={[]} {...COPY} />);
        expect(container.innerHTML).toBe('');
    });
});
