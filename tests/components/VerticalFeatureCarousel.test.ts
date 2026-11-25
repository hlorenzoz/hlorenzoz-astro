import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import VerticalFeatureCarousel from '@/src/components/VerticalFeatureCarousel.astro';
import type { PortfolioSlide } from '@/lib/portfolio';
import en from '@/messages/en.json';

/**
 * Slide selection, arrow keys, the lightboxes and the scroll lock run in the
 * component's client script, which the Container API does not execute. This
 * file pins the server-rendered initial state those depend on: one current
 * slide, every other slide's details and media hidden, prev disabled, closed
 * lightboxes, and the class tokens the script swaps (Playwright owns the
 * interaction).
 */
const mockSlides: PortfolioSlide[] = [
    { id: '1', image: '/1.webp', title: 'Visibility', badge: 'SEO', description: 'Test' },
    { id: '2', image: '/2.webp', title: 'Tech Stack', badge: 'Astro', description: 'Test' },
    { id: '3', image: ['/3a.webp', '/3b.webp'], title: 'GBP Optimization', badge: 'GBP', description: 'Test' },
];

const render = (props: Record<string, unknown> = {}) => renderAstro(VerticalFeatureCarousel, { locale: 'en', slides: mockSlides, ...props });

const slideButtons = (screen: Awaited<ReturnType<typeof render>>) =>
    screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-current'));

describe('VerticalFeatureCarousel', () => {
    it('keeps the keyboard hint readable (WCAG AA contrast on white)', async () => {
        // text-gray-400 on white is about 2.5:1; Lighthouse flagged it on every portfolio page.
        const r = await render();
        const hint = r.getByText(/Interact using clicks or/i);
        expect(hint).not.toHaveClass('text-gray-400');
        expect(hint).toHaveClass('text-gray-600');
    });

    it('names every image-carousel control and spaces the dots for touch (WCAG 2.5.8)', async () => {
        const screen = await render();
        // Slide 3 has two images: inline and lightbox prev/next, plus one dot per image.
        expect(screen.getAllByRole('button', { name: 'Previous image', hidden: true }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('button', { name: 'Next image', hidden: true }).length).toBeGreaterThan(0);
        const dots = screen.body.querySelectorAll('[data-hic-dot]');
        expect([...dots].map((d) => d.getAttribute('aria-label'))).toEqual(
            Array.from({ length: dots.length }, (_, i) => `Go to image ${(i % 2) + 1}`)
        );
        expect(dots[0].parentElement).toHaveClass('gap-4');
    });

    it('makes only the header row the slide button, so links and copy stay outside it', async () => {
        const screen = await render();
        for (const trigger of slideButtons(screen)) {
            expect(trigger).toHaveAttribute('data-vfc-trigger');
            expect(trigger.querySelector('a, h3, p')).toBeNull();
            expect(trigger.closest('[data-vfc-item]')).not.toBe(trigger);
        }
    });

    it('renders the fallback header and the initial slide without a translation key', async () => {
        const screen = await render();
        expect(screen.getByText(/Technical Excellence/i)).not.toBeNull();
        expect(screen.getAllByText(/Visibility/i).length).toBeGreaterThan(0);
    });

    it('uses the entry copy when a translation key is given', async () => {
        const item = en.portfolio['lorenzoz-agency'].features_carousel;
        const screen = await render({
            translationKey: 'portfolio.lorenzoz-agency.features_carousel',
            slides: [{ id: 'tech', image: '/1.webp', badge: 'fallback badge' }],
        });
        expect(screen.getByRole('heading', { level: 2, name: item.title })).toBeInTheDocument();
        expect(screen.getByText(item.slides.tech.badge)).toBeInTheDocument();
        expect(screen.queryByText('fallback badge')).toBeNull();
    });

    it('renders all slide trigger buttons, labelled by their badge', async () => {
        const screen = await render();
        expect(slideButtons(screen).map((b) => b.getAttribute('aria-label'))).toEqual([
            'Select section: SEO',
            'Select section: Astro',
            'Select section: GBP',
        ]);
    });

    it('marks exactly the first slide as current and shows only its details', async () => {
        const screen = await render();
        const current = slideButtons(screen).filter((b) => b.getAttribute('aria-current') === 'true');
        expect(current).toHaveLength(1);
        expect(current[0].textContent).toMatch(/SEO/);

        const details = screen.body.querySelectorAll('[data-vfc-details]');
        expect([...details].map((d) => d.hasAttribute('hidden'))).toEqual([false, true, true]);
        const media = screen.body.querySelectorAll('[data-vfc-media]');
        expect([...media].map((d) => d.hasAttribute('hidden'))).toEqual([false, true, true]);
    });

    it('carries the active/inactive class tokens the script swaps', async () => {
        const screen = await render();
        // The tokens live on the slide container that wraps each header-row button.
        const [first, second] = slideButtons(screen).map((b) => b.closest<HTMLElement>('[data-vfc-item]')!);
        expect(first.className).toContain('bg-blue-50/50');
        expect(second.className).toContain('border-transparent');
        expect(first.dataset.vfcOn).toContain('bg-blue-50/50');
        expect(first.dataset.vfcOff).toContain('border-transparent');
    });

    it('starts with the prev button disabled and next enabled', async () => {
        const screen = await render();
        expect(screen.getByRole('button', { name: /previous feature/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /next feature/i })).not.toBeDisabled();
    });

    it('disables next when there is a single slide', async () => {
        const screen = await render({ slides: mockSlides.slice(0, 1) });
        expect(screen.getByRole('button', { name: /next feature/i })).toBeDisabled();
    });

    it('ships the lightbox closed and empty, with the zoom target on the image', async () => {
        const screen = await render();
        const lightbox = screen.body.querySelector('[data-vfc-lightbox]');
        expect(lightbox).toHaveAttribute('hidden');
        // No src until opened: a closed lightbox costs no download.
        expect(screen.body.querySelector('[data-vfc-lightbox-img]')).not.toHaveAttribute('src');
        expect(screen.getAllByAltText('Full Screen')).toHaveLength(1);
        expect(screen.body.querySelector('[data-vfc-zoom="/1.webp"]')).not.toBeNull();
    });

    it('renders a horizontal carousel for a slide with several images', async () => {
        const screen = await render();
        // Mobile (inline) and desktop panels, each with its own closed modal.
        const carousels = screen.body.querySelectorAll('[data-hic]');
        expect(carousels).toHaveLength(2);
        for (const hic of carousels) {
            expect(hic.querySelectorAll('[data-hic-slide]')).toHaveLength(2);
            expect(hic.querySelector('[data-hic-modal]')).toHaveAttribute('hidden');
        }
    });

    it('renders nothing with no slides', async () => {
        // Only the component's (inert) script tag remains: no section, no lightbox.
        const { body } = await render({ slides: [] });
        expect(body.querySelector('section')).toBeNull();
        expect(body.querySelector('[data-vfc-lightbox]')).toBeNull();
    });
});
