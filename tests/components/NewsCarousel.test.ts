import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import NewsCarousel from '@/src/components/NewsCarousel.astro';

const ITEMS = [
    { slug: 'post-b', title: 'Post B', image: 'https://cdn.hlorenzoz.com/b.webp', datePublished: '2026-11-24' },
    { slug: 'post-a', title: 'Post A', image: 'https://cdn.hlorenzoz.com/a.webp', datePublished: '2026-10-01' },
];
const COPY = { eyebrow: 'NEWS', title: 'Latest News', subtitle: 'sub', viewAll: 'See all news' };

describe('NewsCarousel', () => {
    it('renders one linked card per post, in order, with a dated time element', async () => {
        const screen = await renderAstro(NewsCarousel, { locale: 'en', items: ITEMS, ...COPY });
        const cards = [...screen.body.querySelectorAll('#news li a')];
        expect(cards.map((a) => a.getAttribute('href'))).toEqual(['/en/news/post-b/', '/en/news/post-a/']);
        expect(screen.body.querySelector('#news li time')?.getAttribute('datetime')).toBe('2026-11-24');
        expect(screen.getByRole('heading', { level: 2, name: 'Latest News' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent?.trim())).toEqual(['Post B', 'Post A']);
    });

    it('links the news index', async () => {
        const screen = await renderAstro(NewsCarousel, { locale: 'es', items: ITEMS, ...COPY });
        expect(screen.getByRole('link', { name: /See all news/ })).toHaveAttribute('href', '/es/news/');
    });

    it('makes the scroll strip keyboard-focusable', async () => {
        const { body } = await renderAstro(NewsCarousel, { locale: 'en', items: ITEMS, ...COPY });
        const strip = body.querySelector('#news ul');
        expect(strip).toHaveAttribute('tabindex', '0');
        expect(strip).toHaveAttribute('aria-label', 'Latest News');
    });

    it('renders nothing without posts', async () => {
        const { html } = await renderAstro(NewsCarousel, { locale: 'en', items: [], ...COPY });
        expect(html.trim()).toBe('');
    });
});
