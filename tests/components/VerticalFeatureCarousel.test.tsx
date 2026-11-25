import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';
import { VerticalFeatureCarousel } from '@/components/VerticalFeatureCarousel';
import { PortfolioSlide } from '@/lib/portfolio';

// Mock next-intl hooks
vi.mock('next-intl', () => ({
    useTranslations: (namespace?: string) => {
        const t = (key: string) => `${namespace ? namespace + '.' : ''}${key}`;
        t.has = () => false; // Default to false to test fallbacks to slide props
        return t;
    },
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, initial: _initial, whileInView: _whileInView, viewport: _viewport, transition: _transition, animate: _animate, exit: _exit, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
        h2: ({ children, initial: _initial, whileInView: _whileInView, viewport: _viewport, transition: _transition, animate: _animate, exit: _exit, ...props }: Record<string, unknown>) => <h2 {...props}>{children as React.ReactNode}</h2>,
        p: ({ children, ...props }: Record<string, unknown>) => <p {...props}>{children as React.ReactNode}</p>,
    },
    useScroll: () => ({
        scrollYProgress: {
            on: vi.fn(() => vi.fn()),
            get: vi.fn(() => 0),
        },
    }),
    useMotionValueEvent: vi.fn(),
    useTransform: vi.fn(),
    useInView: vi.fn(() => true),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    ArrowLeft: () => <div data-testid="icon-left" />,
    ArrowRight: () => <div data-testid="icon-right" />,
    ExternalLink: () => <div data-testid="icon-external" />,
    Plus: () => <div data-testid="icon-plus" />,
    ChevronLeft: () => <div data-testid="icon-left-chevron" />,
    ChevronRight: () => <div data-testid="icon-right-chevron" />,
    Maximize2: () => <div data-testid="icon-maximize" />,
    X: () => <div data-testid="icon-close" />,
}));

const mockSlides: PortfolioSlide[] = [
    { id: '1', image: '/1.webp', title: 'Visibility', badge: 'SEO', description: 'Test' },
    { id: '2', image: '/2.webp', title: 'Tech Stack', badge: 'NextJS', description: 'Test' },
    { id: '3', image: '/3.webp', title: 'GBP Optimization', badge: 'GBP', description: 'Test' },
];

describe('VerticalFeatureCarousel', () => {
    it('renders the header and initial slide', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <VerticalFeatureCarousel slides={mockSlides} />
            </NextIntlClientProvider>
        );

        // Use regex search for text rendered via translations (or in mocks)
        expect(screen.getByText(/Technical Excellence/i)).not.toBeNull();
        expect(screen.getAllByText(/Visibility/i).length).toBeGreaterThan(0);
    });

    it('renders all slide trigger buttons', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <VerticalFeatureCarousel slides={mockSlides} />
            </NextIntlClientProvider>
        );

        const buttons = screen.getAllByRole('button');
        const slideButtons = buttons.filter(b => b.textContent && (
            b.textContent.includes('SEO') ||
            b.textContent.includes('NextJS') ||
            b.textContent.includes('GBP')
        ));
        expect(slideButtons.length).toBeGreaterThan(0);
    });

    it('handles navigation buttons', () => {
        const scrollToMock = vi.fn();
        window.scrollTo = scrollToMock;

        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <VerticalFeatureCarousel slides={mockSlides} />
            </NextIntlClientProvider>
        );

        // Find and click the 'right' button
        const rightBtn = screen.getByTestId('icon-right').parentElement!;
        fireEvent.click(rightBtn);
        // We no longer expect window.scrollTo because scroll sync is removed

        // Find and click a 'left' button
        const leftBtn = screen.getByTestId('icon-left').parentElement!;
        fireEvent.click(leftBtn);

        const visibilityBtn = screen.getByText(/Visibility/i);
        fireEvent.click(visibilityBtn);
    });

    /**
     * The keydown listener depended on `activeIndex` and `selectedImage`, so it
     * was detached and reattached on every arrow press and every lightbox
     * toggle. It also listed `isCarouselModalOpen`, which the handler never
     * read — the modal state is consulted through a ref precisely so it does not
     * force a re-subscription.
     */
    describe('keyboard listener subscription', () => {
        const renderCarousel = (slides = mockSlides) =>
            render(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={slides} />
                </NextIntlClientProvider>
            );

        const countKeydownSubscriptions = () => {
            const add = vi.spyOn(window, 'addEventListener');
            return {
                get count() {
                    return add.mock.calls.filter(([type]) => type === 'keydown').length;
                },
                restore: () => add.mockRestore(),
            };
        };

        it('does not re-subscribe as the active slide advances', () => {
            renderCarousel();
            const subs = countKeydownSubscriptions();

            for (let i = 0; i < 4; i += 1) {
                fireEvent.keyDown(window, { key: 'ArrowRight' });
            }

            // Under the old dependency list each press re-subscribed.
            expect(subs.count).toBe(0);
            subs.restore();
        });

        it('still advances and wraps the active slide with the arrow keys', () => {
            renderCarousel();

            // Three slides: two rights lands on the third, a third wraps to the first.
            fireEvent.keyDown(window, { key: 'ArrowRight' });
            fireEvent.keyDown(window, { key: 'ArrowRight' });
            expect(screen.getByText(/GBP Optimization/i)).toBeDefined();

            fireEvent.keyDown(window, { key: 'ArrowRight' });
            expect(screen.getByText(/Visibility/i)).toBeDefined();

            // And backwards wraps the other way.
            fireEvent.keyDown(window, { key: 'ArrowLeft' });
            expect(screen.getByText(/GBP Optimization/i)).toBeDefined();
        });

        it('does not crash on arrow keys with no slides', () => {
            expect(() => {
                renderCarousel([]);
                fireEvent.keyDown(window, { key: 'ArrowRight' });
                fireEvent.keyDown(window, { key: 'ArrowLeft' });
            }).not.toThrow();
        });

        /**
         * The NaN guard, made observable.
         *
         * Hooks run before the `slides.length === 0` early return, so the
         * keydown listener is live even with no slides. `% 0` is NaN, and NaN
         * slips through `scrollToSlide`'s range check — `NaN < 0` and
         * `NaN >= total` are both false — landing in `setActiveIndex`.
         *
         * With no slides the component renders null, so the corrupt index is
         * invisible. It becomes visible as soon as slides arrive: `activeIndex`
         * is state and survives the re-render, and `activeIndex === i` is false
         * for every i, so no slide is current and the prev button is not
         * disabled. Asserting after slides arrive is what makes this a real
         * guard rather than a smoke test.
         */
        it('keeps a usable index when arrows fire before the slides arrive', () => {
            const { rerender } = render(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={[]} />
                </NextIntlClientProvider>
            );

            fireEvent.keyDown(window, { key: 'ArrowRight' });

            rerender(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={mockSlides} />
                </NextIntlClientProvider>
            );

            // Under the unguarded version activeIndex is NaN, so this is empty.
            const current = screen
                .getAllByRole('button')
                .filter((b) => b.getAttribute('aria-current') === 'true');

            expect(current).toHaveLength(1);
            expect(current[0].textContent).toMatch(/Visibility/i);
        });

        it('leaves the prev button disabled after arrows fire with no slides', () => {
            const { rerender } = render(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={[]} />
                </NextIntlClientProvider>
            );

            fireEvent.keyDown(window, { key: 'ArrowLeft' });

            rerender(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={mockSlides} />
                </NextIntlClientProvider>
            );

            // `NaN === 0` is false, so the unguarded version enables the button
            // and offers navigation from an index that does not exist.
            const prevBtn = screen.getByRole('button', { name: /previous feature/i });
            expect(prevBtn.hasAttribute('disabled')).toBe(true);
        });
    });

    /**
     * Escape handling was rewritten to close the lightbox functionally, so that
     * `selectedImage` no longer forces the keydown listener to re-subscribe on
     * every open and close. These lock the behaviour that rewrite had to
     * preserve.
     */
    describe('lightbox Escape handling', () => {
        const openLightbox = (container: HTMLElement) => {
            const zoom = container.querySelector('.cursor-zoom-in') as HTMLElement;
            expect(zoom).not.toBeNull();
            fireEvent.click(zoom);
        };

        it('closes an open lightbox on Escape', () => {
            const { container } = render(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={mockSlides} />
                </NextIntlClientProvider>
            );

            openLightbox(container);
            expect(screen.getByAltText('Full Screen')).toBeDefined();

            fireEvent.keyDown(window, { key: 'Escape' });
            expect(screen.queryByAltText('Full Screen')).toBeNull();
        });

        it('does not change the active slide when Escape closes the lightbox', () => {
            const { container } = render(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={mockSlides} />
                </NextIntlClientProvider>
            );

            fireEvent.keyDown(window, { key: 'ArrowRight' });
            openLightbox(container);
            fireEvent.keyDown(window, { key: 'Escape' });

            // Escape returns early, so it must never fall through to the arrow
            // branches and move the carousel underneath the reader.
            const current = screen
                .getAllByRole('button')
                .filter((b) => b.getAttribute('aria-current') === 'true');
            expect(current[0].textContent).toMatch(/Tech Stack/i);
        });

        it('is harmless when no lightbox is open', () => {
            render(
                <NextIntlClientProvider locale="en" messages={messages}>
                    <VerticalFeatureCarousel slides={mockSlides} />
                </NextIntlClientProvider>
            );

            fireEvent.keyDown(window, { key: 'Escape' });

            const current = screen
                .getAllByRole('button')
                .filter((b) => b.getAttribute('aria-current') === 'true');
            expect(current).toHaveLength(1);
            expect(current[0].textContent).toMatch(/Visibility/i);
        });
    });
});
