import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import footerEn from '@/messages/en.json';
import footerEs from '@/messages/es.json';

/**
 * Overrides the sitewide `vitest.setup.ts` mock (which returns identity keys
 * and an empty `t.raw`) with real `footer.*`/`legal.*` copy, so assertions
 * can check the actual resolved hrefs the way a user's browser would.
 */
function mockNextIntl(locale: 'en' | 'es') {
    const messages = locale === 'en' ? footerEn : footerEs;
    vi.doMock('next-intl', () => ({
        useLocale: () => locale,
        useTranslations: (namespace?: string) => {
            const source = namespace
                ? ((messages as Record<string, unknown>)[namespace] as Record<string, unknown>)
                : (messages as unknown as Record<string, unknown>);
            const t = (key: string) => {
                const parts = key.split('.');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let v: any = source;
                for (const p of parts) v = v?.[p];
                return v ?? key;
            };
            t.raw = (key: string) => {
                const parts = key.split('.');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let v: any = source;
                for (const p of parts) v = v?.[p];
                return v;
            };
            return t;
        },
        NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    }));
}

describe('Footer services links (fixed, registry-derived hrefs)', () => {
    it('links every services item to its explicit href from footer.services.items, EN', async () => {
        vi.resetModules();
        mockNextIntl('en');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/en/services/' }));
        const { Footer: EnFooter } = await import('@/components/Footer');
        render(<EnFooter />);

        expect(screen.getByText('AI Voice Receptionist').closest('a')).toHaveAttribute(
            'href',
            '/en/services/ai-voice-receptionist'
        );
        expect(screen.getByText('Website Development').closest('a')).toHaveAttribute(
            'href',
            '/en/services/website-development'
        );
        expect(screen.getByText('Local SEO').closest('a')).toHaveAttribute(
            'href',
            '/en/services/local-seo'
        );
        expect(screen.getByText('Software Development').closest('a')).toHaveAttribute(
            'href',
            '/en/services/software-development'
        );
        // Portfolio and Pricing moved to the Agency column; their hrefs are unchanged.
        expect(screen.getByText('Portfolio').closest('a')).toHaveAttribute('href', '/en/portfolio');
        expect(screen.getByText('Pricing').closest('a')).toHaveAttribute('href', '/en#pricing');
    });

    it('lists Local SEO first: it is the core offer', () => {
        const items = footerEn.footer.services.items as unknown as { label: string; href: string }[];
        expect(items.map((item) => item.href)).toEqual([
            '/services/local-seo',
            '/services/website-development',
            '/services/ai-voice-receptionist',
            '/services/software-development',
        ]);
    });

    it('no longer links the absorbed or the paused service, EN', async () => {
        vi.resetModules();
        mockNextIntl('en');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/en/services/' }));
        const { Footer: EnFooter } = await import('@/components/Footer');
        const { container } = render(<EnFooter />);

        // Review management is a pillar of Local SEO; the Digital Business Card
        // is paused. Either link would lead to a page that no longer exists.
        expect(screen.queryByText('Review Management')).toBeNull();
        expect(screen.queryByText('Digital Business Card')).toBeNull();
        expect(container.innerHTML).not.toMatch(/reputation-review-management|services\/digital-business-card/);
    });

    it('no longer links the paused card service, ES', async () => {
        vi.resetModules();
        mockNextIntl('es');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/es/services/' }));
        const { Footer: EsFooter } = await import('@/components/Footer');
        render(<EsFooter />);

        expect(screen.queryByText('Tarjeta Digital')).toBeNull();
        expect(screen.getByText('SEO Local').closest('a')).toHaveAttribute('href', '/es/services/local-seo');
    });

    it('resolves every services.items entry to an explicit href pair, no string-matched fallback', () => {
        // Structural guard on the data itself: every entry in the registry is
        // an object carrying its own href, not a bare label the component
        // must guess at via string matching.
        for (const item of footerEn.footer.services.items as unknown as { label: string; href: string }[]) {
            expect(typeof item).toBe('object');
            expect(item.label).toBeTruthy();
            expect(item.href).toBeTruthy();
        }
    });
});

/**
 * The Agency column carried the SAME string-matching bug the Services column
 * did: it compared the translated label against hardcoded literals
 * (`"Héctor's Card"`, `"Contact"`, and their Spanish twins) and fell back to
 * `#home` on a miss. Fixing only one left an identical trap one column over,
 * which is what these cover.
 *
 * Link assertions use `getByRole('link', ...)`, not `getByText`: the Agency
 * column has a "Services" link (to the hub) while the third column's heading is
 * also "Services", so a bare text query would match both and throw.
 */
describe('Footer agency links', () => {
    it('links every agency item to its explicit href, EN', async () => {
        vi.resetModules();
        mockNextIntl('en');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/en/services/' }));
        const { Footer: EnFooter } = await import('@/components/Footer');
        render(<EnFooter />);

        expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/en/services');
        expect(screen.getByRole('link', { name: "Héctor's Card" })).toHaveAttribute('href', '/en/card/hector');
        expect(screen.getByRole('link', { name: 'Sitemap' })).toHaveAttribute('href', '/en/sitemap');
        expect(screen.getByRole('link', { name: 'News' })).toHaveAttribute('href', '/en/news');
        // A homepage anchor, reached from a non-homepage route, has to travel
        // back to the homepage first.
        expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/en#contact');
    });

    it('links every agency item to its explicit href, ES', async () => {
        vi.resetModules();
        mockNextIntl('es');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/es/services/' }));
        const { Footer: EsFooter } = await import('@/components/Footer');
        render(<EsFooter />);

        expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '/es/services');
        expect(screen.getByRole('link', { name: 'Tarjeta de Héctor' })).toHaveAttribute('href', '/es/card/hector');
        expect(screen.getByRole('link', { name: 'Mapa del sitio' })).toHaveAttribute('href', '/es/sitemap');
        expect(screen.getByRole('link', { name: 'Noticias' })).toHaveAttribute('href', '/es/news');
        // The anchor id is the English `contact` in both locales: it is a DOM
        // id on the homepage, not user-facing copy.
        expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/es#contact');
    });

    it('lists News right after Portfolio in both locales', () => {
        for (const messages of [footerEn, footerEs]) {
            const hrefs = (messages.footer.agency.items as unknown as { href: string }[]).map((i) => i.href);
            expect(hrefs.indexOf('/news')).toBe(hrefs.indexOf('/portfolio') + 1);
        }
    });

    it('resolves every agency.items entry to an explicit href pair', () => {
        for (const item of footerEn.footer.agency.items as unknown as { label: string; href: string }[]) {
            expect(typeof item).toBe('object');
            expect(item.label).toBeTruthy();
            expect(item.href).toBeTruthy();
        }
    });

    it('orders the columns Agency before Services', async () => {
        vi.resetModules();
        mockNextIntl('en');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/en/' }));
        const { Footer: EnFooter } = await import('@/components/Footer');
        const { container } = render(<EnFooter />);

        const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent);
        expect(headings.indexOf('Agency')).toBeLessThan(headings.indexOf('Services'));
    });
});

describe('Footer legal links (unchanged, must not regress)', () => {
    it('still links legal items via {label, href} pairs', async () => {
        vi.resetModules();
        mockNextIntl('en');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/en/services/' }));
        const { Footer: EnFooter } = await import('@/components/Footer');
        render(<EnFooter />);

        expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute(
            'href',
            '/en/privacy-policy'
        );
    });
});

describe('Footer social links', () => {
    it('renders LinkedIn, GitHub, and Upwork links with correct attributes', async () => {
        vi.resetModules();
        mockNextIntl('en');
        vi.doMock('next/navigation', () => ({ usePathname: () => '/en/' }));
        const { Footer: EnFooter } = await import('@/components/Footer');
        render(<EnFooter />);

        const githubLink = screen.getByRole('link', { name: 'GitHub' });
        expect(githubLink).toHaveAttribute('href', 'https://github.com/hlorenzoz');
        expect(githubLink).toHaveAttribute('target', '_blank');
        expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');

        const linkedinLink = screen.getByRole('link', { name: 'LinkedIn' });
        expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/hlorenzoz/');

        const upworkLink = screen.getByRole('link', { name: 'Upwork' });
        expect(upworkLink).toHaveAttribute('href', 'https://www.upwork.com/freelancers/hlorenzoz');
    });
});
