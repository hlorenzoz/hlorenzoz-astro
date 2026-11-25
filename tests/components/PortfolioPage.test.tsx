import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';
import PortfolioPage from '@/app/[locale]/portfolio/page';
import PortfolioItemPage, { generateStaticParams } from '@/app/[locale]/portfolio/[slug]/page';

// Mock Lucide icons
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...actual as any,
        ArrowRight: () => <div data-testid="icon-arrow" />,
        ExternalLink: () => <div data-testid="icon-external" />,
        Plus: () => <div data-testid="icon-plus" />,
        ArrowUp: () => <div data-testid="icon-arrow-up" />,
        ArrowDown: () => <div data-testid="icon-arrow-down" />,
        ChevronDown: () => <div data-testid="icon-chevron" />,
        ChevronLeft: () => <div data-testid="icon-left" />,
        ChevronRight: () => <div data-testid="icon-right" />,
        Maximize2: () => <div data-testid="icon-maximize" />,
        X: () => <div data-testid="icon-close" />,
        Globe: () => <div data-testid="icon-globe" />,
        Layout: () => <div data-testid="icon-layout" />
    };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
    usePathname: () => '/en/portfolio',
    useParams: () => ({ locale: 'en' }),
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
    }),
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

// Mock portfolio actions
vi.mock('@/lib/actions/portfolio', () => ({
    getPortfolioItemsAction: vi.fn(async () => [
        { id: 'dental-clinic-1', slug: 'dental-clinic-1', type: 'demo', image: '/demos/dental-1.webp', url: '#' }
    ]),
    getPortfolioItemBySlugAction: vi.fn(async (slug) => {
        if (slug === 'dental-clinic-1') {
            return {
                id: 'dental-clinic-1',
                slug: 'dental-clinic-1',
                type: 'demo',
                image: '/demos/dental-1.webp',
                url: '#',
                fullScreenshot: '/demos/dental-full.webp',
                slides: [
                    { id: '1', image: '/1.webp', title: 'Test', badge: 'Test', description: 'Test' }
                ]
            };
        }
        if (slug === 'malaga-event-gear') {
            return {
                id: 'malaga-event-gear',
                slug: 'malaga-event-gear',
                type: 'live',
                image: '/meg-0.webp',
                url: 'https://malagaeventgear.com/',
                fullScreenshot: ['/meg-1.webp', '/meg-2.webp'],
                bookingUrl: 'https://malagaeventgear.com/packages/',
            };
        }
        return null;
    }),
}));

describe('Portfolio Pages', () => {
    const renderPortfolioPage = async () => {
        const params = Promise.resolve({ locale: 'en' });
        const result = await PortfolioPage({ params });
        return render(
            <NextIntlClientProvider locale="en" messages={messages}>
                {result}
            </NextIntlClientProvider>
        );
    };

    const renderItemPage = async (slug: string) => {
        const params = Promise.resolve({ slug, locale: 'en' });
        const result = await PortfolioItemPage({ params });
        return render(
            <NextIntlClientProvider locale="en" messages={messages}>
                {result}
            </NextIntlClientProvider>
        );
    };

    it('renders the Portfolio list page with correct translation keys', async () => {
        const { container } = await renderPortfolioPage();

        // Check IDs
        expect(container.querySelector('#portfolio-hero')).not.toBeNull();
        expect(container.querySelector('#portfolio-grid')).not.toBeNull();

        // In this project's vitest setup, server translations render as keys
        expect(screen.getByText(/list\.title/i)).toBeInTheDocument();
        expect(screen.getByText(/dental-clinic-1\.title/i)).toBeInTheDocument();
    });

    it('renders the Portfolio detail page with correct translation keys', async () => {
        const { container } = await renderItemPage('dental-clinic-1');

        // Check IDs
        expect(container.querySelector('#portfolio-hero')).not.toBeNull();
        expect(container.querySelector('#portfolio-showcase')).not.toBeNull();
        expect(container.querySelector('#portfolio-cta')).not.toBeNull();

        // Check content via keys
        expect(screen.getAllByText(/badge/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/heroTitle/i).length).toBeGreaterThan(0);
    });

    it('points the quote CTAs to the external bookingUrl when provided', async () => {
        const { container } = await renderItemPage('malaga-event-gear');

        // Bottom CTA section holds a single anchor: the booking button.
        const ctaLink = container.querySelector('#portfolio-cta a');
        expect(ctaLink?.getAttribute('href')).toBe('https://malagaeventgear.com/packages/');
        expect(ctaLink?.getAttribute('target')).toBe('_blank');
        expect(ctaLink?.getAttribute('rel')).toContain('noopener');

        // Hero quote button is external too.
        const heroBooking = container.querySelector('#portfolio-hero a[href="https://malagaeventgear.com/packages/"]');
        expect(heroBooking).not.toBeNull();
        expect(heroBooking?.getAttribute('target')).toBe('_blank');
    });

    it('falls back to the local contact section when no bookingUrl is set', async () => {
        const { container } = await renderItemPage('dental-clinic-1');
        const ctaLink = container.querySelector('#portfolio-cta a');
        expect(ctaLink?.getAttribute('href')).toBe('/en#contact');
        expect(ctaLink?.getAttribute('target')).toBeNull();
    });

    it('calls notFound when an invalid slug is provided', async () => {
        const { notFound } = await import('next/navigation');
        try {
            await renderItemPage('invalid-slug');
        } catch (e: unknown) {
            expect((e as Error).message).toBe('NEXT_NOT_FOUND');
        }
        expect(notFound).toHaveBeenCalled();
    });

    it('generates static params correctly', async () => {
        const params = await generateStaticParams();
        expect(params.length).toBeGreaterThan(0);
        expect(params[0]).toHaveProperty('locale');
        expect(params[0]).toHaveProperty('slug');
    });
});
