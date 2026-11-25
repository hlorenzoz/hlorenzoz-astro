/**
 * "About the business" on a portfolio detail page: who the client is, in its
 * own terms, before the page talks about the website. Only real client sites
 * (`type: 'live'`) have a business to describe; demos render nothing new.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';
import { PortfolioBusiness } from '@/components/PortfolioBusiness';
import PortfolioItemPage from '@/app/[locale]/portfolio/[slug]/page';

vi.mock('next/navigation', () => ({
    usePathname: () => '/en/portfolio',
    useParams: () => ({ locale: 'en' }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

vi.mock('@/lib/actions/portfolio', () => ({
    getPortfolioItemsAction: vi.fn(async () => []),
    getPortfolioItemBySlugAction: vi.fn(async (slug: string) => ({
        id: slug,
        slug,
        type: slug === 'gerp-dj' ? 'live' : 'demo',
        image: '/cover.webp',
        url: '#',
    })),
}));

describe('PortfolioBusiness', () => {
    it('renders a level 2 heading and every paragraph', () => {
        render(<PortfolioBusiness title="About GERP DJ" paragraphs={['First.', 'Second.']} />);
        expect(screen.getByRole('heading', { level: 2, name: 'About GERP DJ' })).toBeInTheDocument();
        expect(screen.getByText('First.')).toBeInTheDocument();
        expect(screen.getByText('Second.')).toBeInTheDocument();
    });

    it('labels its section with the heading', () => {
        render(<PortfolioBusiness title="About GERP DJ" paragraphs={['First.']} />);
        expect(screen.getByRole('region', { name: 'About GERP DJ' })).toBeInTheDocument();
    });

    it('renders nothing without copy', () => {
        const { container } = render(<PortfolioBusiness title="About" paragraphs={[]} />);
        expect(container.innerHTML).toBe('');
    });
});

describe('portfolio detail page: business section', () => {
    const renderItemPage = async (slug: string) => {
        const result = await PortfolioItemPage({ params: Promise.resolve({ slug, locale: 'en' }) });
        return render(
            <NextIntlClientProvider locale="en" messages={messages}>
                {result}
            </NextIntlClientProvider>
        );
    };

    it('renders on a live entry', async () => {
        const { container } = await renderItemPage('gerp-dj');
        const section = container.querySelector('#portfolio-business');
        expect(section).not.toBeNull();
        // The vitest next-intl/server mock echoes keys and returns mock arrays from t.raw.
        expect(section!.querySelector('h2')?.textContent).toBe('business.title');
        expect(section!.querySelectorAll('p').length).toBeGreaterThan(0);
    });

    it('sits between the hero and the CTA', async () => {
        const { container } = await renderItemPage('gerp-dj');
        const ids = [...container.querySelectorAll('main > section, main > div[id]')].map((el) => el.id);
        expect(ids.indexOf('portfolio-business')).toBe(ids.indexOf('portfolio-hero') + 1);
    });

    it('does not render on a demo entry', async () => {
        const { container } = await renderItemPage('dental-clinic-1');
        expect(container.querySelector('#portfolio-business')).toBeNull();
    });
});
