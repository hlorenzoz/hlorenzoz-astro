import { describe, it, expect } from 'vitest';
import type { PortfolioItem } from '@/lib/portfolio';
import messages from '@/messages/en.json';
import { renderAstro } from '@/tests/helpers/render';
import PortfolioCarousel from '@/src/components/PortfolioCarousel.astro';

const copy = messages.portfolio.portfolioCarousel;

describe('PortfolioCarousel', () => {
    // Real ids: the translator throws on a missing key in tests.
    const mockItems: PortfolioItem[] = [
        { id: 'dental-clinic-1', slug: 'dental-clinic-1', lastModified: '2026-07-20', type: 'demo', image: '/demos/dental-1.webp', url: '#', fullScreenshot: '/demos/dental-full.webp' },
        { id: 'lorenzoz-agency', slug: 'lorenzoz-agency', lastModified: '2026-07-20', type: 'live', image: '/demos/gym-1.webp', url: 'https://gym.demo', fullScreenshot: '/demos/gym-full.webp' },
    ];

    const renderCarousel = (items = mockItems) => renderAstro(PortfolioCarousel, { portfolioItems: items, locale: 'en' });

    it('renders the carousel with sections and translations', async () => {
        const screen = await renderCarousel();

        expect(screen.body.querySelector('#portfolio')).not.toBeNull();
        expect(screen.getByRole('heading', { level: 2, name: copy.title })).toBeInTheDocument();
        expect(screen.getByText(copy.subtitle)).toBeInTheDocument();
        // One compact card per project: its title appears once, at every width.
        expect(screen.getAllByText(messages.portfolio['dental-clinic-1'].title)).toHaveLength(1);
        expect(screen.getAllByText(messages.portfolio['lorenzoz-agency'].title)).toHaveLength(1);
    });

    it('links the portfolio index and each project with trailing slashes', async () => {
        const screen = await renderCarousel();
        expect(screen.getByRole('link', { name: copy.cta })).toHaveAttribute('href', '/en/portfolio/');
        const explore = screen.getAllByRole('link', { name: copy.explore }).map((a) => a.getAttribute('href'));
        expect(explore).toEqual(['/en/portfolio/dental-clinic-1/', '/en/portfolio/lorenzoz-agency/']);
    });

    it('makes every project title a link to its detail page', async () => {
        const screen = await renderCarousel();
        const titles = [...screen.body.querySelectorAll('#portfolio h3')];
        expect(titles.length).toBeGreaterThan(0);
        for (const h3 of titles) {
            expect(h3.querySelector('a')?.getAttribute('href')).toMatch(/^\/en\/portfolio\/[a-z0-9-]+\/$/);
        }
    });

    it('displays the scroll container and respects snap points', async () => {
        const { body } = await renderCarousel();
        expect(body.querySelector('.snap-x')).not.toBeNull();
    });

    it('renders pagination dots matching item count, the first one current', async () => {
        const screen = await renderCarousel();
        const dots = screen.getAllByRole('button', { name: /Go to slide/ });
        expect(dots.length).toBe(mockItems.length);
        expect(dots.map((d) => d.getAttribute('aria-current'))).toEqual(['true', 'false']);
    });

    it('shows badge and type labels via key mapping', async () => {
        const screen = await renderCarousel();
        expect(screen.getAllByText(messages.portfolio['dental-clinic-1'].badge).length).toBeGreaterThan(0);
        expect(screen.getAllByText(messages.portfolio.type.live).length).toBeGreaterThan(0);
        expect(screen.getAllByText(messages.portfolio.type.demo).length).toBeGreaterThan(0);
    });

    /**
     * Scrolling, the ResizeObserver and the keyboard handler live in the client
     * script (covered by Playwright). Here: the initial state it starts from.
     */
    it('starts with "previous" disabled and "next" enabled, with the script hooks in place', async () => {
        const screen = await renderCarousel();
        expect(screen.getByRole('button', { name: copy.prevSlide })).toBeDisabled();
        expect(screen.getByRole('button', { name: copy.nextSlide })).toBeEnabled();
        const root = screen.body.querySelector('#portfolio[data-carousel]') as HTMLElement;
        expect(root.querySelector('[data-carousel-track]')?.children).toHaveLength(2);
    });
});
