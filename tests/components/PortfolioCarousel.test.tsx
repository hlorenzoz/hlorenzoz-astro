import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';
import { PortfolioCarousel } from '@/components/PortfolioCarousel';
import { PortfolioItem } from '@/lib/portfolio';

// Mock useParams
vi.mock('next/navigation', () => ({
    useParams: () => ({ locale: 'en' }),
    usePathname: () => '/en',
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    ArrowRight: () => <div data-testid="icon-arrow" />,
    Eye: () => <div data-testid="icon-eye" />,
    ExternalLink: () => <div data-testid="icon-external" />,
    Globe: () => <div data-testid="icon-globe" />,
    Layout: () => <div data-testid="icon-layout" />,
    ChevronLeft: () => <div data-testid="icon-chevron-left" />,
    ChevronRight: () => <div data-testid="icon-chevron-right" />,
}));


// Mock framer-motion as it can cause issues in Vitest
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, initial: _initial, whileInView: _whileInView, viewport: _viewport, transition: _transition, animate: _animate, exit: _exit, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: { children?: React.ReactNode; [key: string]: any }) => <>{children}</>,
}));


/**
 * Counts constructions so the re-subscription regression is observable, and
 * keeps the latest callback so a test can drive a resize: jsdom reports 0 for
 * every layout box, so the component's mount-time measurement is 0 and the
 * width has to be re-measured after the test sets `offsetWidth`.
 */
const observer = { count: 0, notify: () => {} };
class CountingResizeObserver {
    constructor(callback: () => void) {
        observer.count += 1;
        observer.notify = callback;
    }
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
}
vi.stubGlobal('ResizeObserver', CountingResizeObserver);

beforeEach(() => {
    observer.count = 0;
});

describe('PortfolioCarousel', () => {
    const mockItems: PortfolioItem[] = [
        { id: 'dental-clinic-1', slug: 'dental-clinic-1', lastModified: '2026-07-20', type: 'demo', image: '/demos/dental-1.webp', url: '#', fullScreenshot: '/demos/dental-full.webp' },
        { id: 'gym-demo', slug: 'gym-demo', lastModified: '2026-07-20', type: 'live', image: '/demos/gym-1.webp', url: 'https://gym.demo', fullScreenshot: '/demos/gym-full.webp' },
    ];


    const renderCarousel = (items = mockItems) => {
        return render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <PortfolioCarousel portfolioItems={items} />
            </NextIntlClientProvider>
        );
    };

    it('renders the carousel with sections and translation keys', () => {
        const { container } = renderCarousel();

        // Check IDs
        expect(container.querySelector('#portfolio')).not.toBeNull();

        // In this project's vitest setup, translations render as keys
        // Use getAllByText as 'title' appears multiple times (section title, project titles)
        expect(screen.getAllByText(/title/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/subtitle/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/dental-clinic-1\.title/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/gym-demo\.title/i).length).toBeGreaterThan(0);
    });

    it('displays the scroll container and respects snap points', () => {
        const { container } = renderCarousel();
        const scrollContainer = container.querySelector('.snap-x');
        expect(scrollContainer).not.toBeNull();
    });

    it('renders pagination dots matching item count', () => {
        renderCarousel();
        const dots = screen.getAllByRole('button');
        // Filter those that have 'aria-label' or have 'goToSlide' key in them
        const paginationDots = dots.filter(d => d.getAttribute('aria-label')?.includes('goToSlide'));
        expect(paginationDots.length).toBe(mockItems.length);
    });

    it('shows badge correctly via key mapping', () => {
        renderCarousel();
        expect(screen.getAllByText(/badge/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/type\.live/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/type\.demo/i).length).toBeGreaterThan(0);
    });

    /**
     * The effect used to depend on `activeIndex`, so every carousel step tore
     * down the ResizeObserver and the scroll listener and built new ones —
     * mid-gesture, and dropping any event that landed in the gap. Identical to
     * the defect fixed in LinkedInArticles; this carousel is where it survived.
     */
    describe('scroll subscription', () => {
        const threeItems: PortfolioItem[] = [
            ...mockItems,
            { id: 'third', slug: 'third', lastModified: '2026-07-20', type: 'demo', image: '/demos/third.webp', url: '#', fullScreenshot: '/demos/third-full.webp' },
        ];

        /** Gives the scroll area a real width and lets the component re-measure. */
        const setWidth = (scrollArea: HTMLElement, width: number) => {
            Object.defineProperty(scrollArea, 'offsetWidth', { value: width, configurable: true });
            act(() => {
                observer.notify();
            });
        };

        it('subscribes once and does not rebuild the observer as the index advances', () => {
            const { container } = renderCarousel(threeItems);
            expect(observer.count).toBe(1);

            const scrollArea = container.querySelector('.snap-x') as HTMLDivElement;
            setWidth(scrollArea, 1000);

            // itemWidth is offsetWidth * 0.8 = 800.
            for (const left of [800, 1600, 2400]) {
                act(() => {
                    scrollArea.scrollLeft = left;
                    scrollArea.dispatchEvent(new Event('scroll'));
                });
            }

            // Under the old `[activeIndex]` dependency this reaches 4.
            expect(observer.count).toBe(1);
        });

        it('still tracks the active slide while subscribed only once', () => {
            const { container } = renderCarousel(threeItems);
            const scrollArea = container.querySelector('.snap-x') as HTMLDivElement;
            setWidth(scrollArea, 1000);

            const dots = screen
                .getAllByRole('button')
                .filter((d) => d.getAttribute('aria-label')?.includes('goToSlide'));
            expect(dots).toHaveLength(3);

            act(() => {
                scrollArea.scrollLeft = 1600;
                scrollArea.dispatchEvent(new Event('scroll'));
            });

            expect(dots[2].getAttribute('aria-current')).toBe('true');
            expect(dots[0].getAttribute('aria-current')).toBe('false');
        });
    });
});
