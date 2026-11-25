import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import navigationEn from '@/messages/en.json';
import { Navbar } from '@/components/Navbar';

/**
 * Overrides the sitewide `vitest.setup.ts` mock (which returns identity keys)
 * with real `navigation.*` copy, so assertions can check actual link labels
 * rather than raw translation keys. Navbar had zero test coverage before this
 * file; the first describe block pins down behavior that must NOT change
 * (portfolio route resolution, hash-anchor resolution, home-page vs
 * non-home-page hash forms) before the `services` link is added.
 */
vi.mock('next-intl', () => ({
    useLocale: () => 'en',
    useTranslations: (namespace?: string) => {
        const source = namespace
            ? ((navigationEn as Record<string, unknown>)[namespace] as Record<string, string>)
            : (navigationEn as unknown as Record<string, string>);
        const t = (key: string) => source?.[key] ?? key;
        return t;
    },
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/en/portfolio',
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

describe('Navbar (pre-existing behavior, must not regress)', () => {
    it('resolves the portfolio link to the real route via localeHref, not a hash', () => {
        render(<Navbar />);
        const links = screen.getAllByText('Portfolio');
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) {
            expect(link.closest('a')).toHaveAttribute('href', '/en/portfolio/');
        }
    });

    it('resolves price/contact to locale-prefixed hashes on a non-home page', () => {
        render(<Navbar />);
        const priceLinks = screen.getAllByText('Price');
        const contactLinks = screen.getAllByText('Contact');
        for (const link of priceLinks) {
            expect(link.closest('a')).toHaveAttribute('href', '/en#pricing');
        }
        for (const link of contactLinks) {
            expect(link.closest('a')).toHaveAttribute('href', '/en#contact');
        }
    });
});

describe('Navbar (home page, pre-existing behavior, must not regress)', () => {
    it('resolves price/contact to bare hashes on the home page', async () => {
        vi.resetModules();
        vi.doMock('next/navigation', () => ({
            usePathname: () => '/en',
            useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
        }));
        const { Navbar: HomeNavbar } = await import('@/components/Navbar');
        render(<HomeNavbar />);
        const priceLinks = screen.getAllByText('Price');
        for (const link of priceLinks) {
            expect(link.closest('a')).toHaveAttribute('href', '#pricing');
        }
    });
});

describe('Navbar Services link (new)', () => {
    it('renders a Services link on desktop and mobile, resolving via localeHref to the services hub', () => {
        render(<Navbar />);
        const serviceLinks = screen.getAllByText('Services');
        expect(serviceLinks).toHaveLength(2);
        for (const link of serviceLinks) {
            expect(link.closest('a')).toHaveAttribute('href', '/en/services/');
        }
    });
});
