import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { within } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import footerEn from '@/messages/en.json';
import footerEs from '@/messages/es.json';
import Footer from '@/src/components/Footer.astro';

/**
 * Renders the Footer as if served at `pathname` (it reads `Astro.url`).
 *
 * Route hrefs carry the trailing slash (`/en/services/`), the canonical form
 * the build emits with `trailingSlash: 'always'`.
 */
async function renderAt(pathname: string, locale = 'en') {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Footer, {
        props: { locale },
        request: new Request(`https://hlorenzoz.com${pathname}`),
    });
    const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
    const body: HTMLElement = document.body;
    return { html, container: body, ...within(body) };
}

describe('Footer services links (fixed, registry-derived hrefs)', () => {
    it('links every services item to its explicit href from footer.services.items, EN', async () => {
        const screen = await renderAt('/en/services/');
        expect(screen.getByText('AI Voice Receptionist').closest('a')).toHaveAttribute('href', '/en/services/ai-voice-receptionist/');
        expect(screen.getByText('Website Development').closest('a')).toHaveAttribute('href', '/en/services/website-development/');
        expect(screen.getByText('Local SEO').closest('a')).toHaveAttribute('href', '/en/services/local-seo/');
        expect(screen.getByText('Software Development').closest('a')).toHaveAttribute('href', '/en/services/software-development/');
        // Portfolio and Pricing moved to the Agency column; their hrefs are unchanged.
        expect(screen.getByText('Portfolio').closest('a')).toHaveAttribute('href', '/en/portfolio/');
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
        const screen = await renderAt('/en/services/');
        // Review management is a pillar of Local SEO; the Digital Business Card
        // is paused. Either link would lead to a page that no longer exists.
        expect(screen.queryByText('Review Management')).toBeNull();
        expect(screen.queryByText('Digital Business Card')).toBeNull();
        expect(screen.html).not.toMatch(/reputation-review-management|services\/digital-business-card/);
    });

    it('no longer links the paused card service, ES', async () => {
        const screen = await renderAt('/es/services/', 'es');
        expect(screen.queryByText('Tarjeta Digital')).toBeNull();
        expect(screen.getByText('SEO Local').closest('a')).toHaveAttribute('href', '/es/services/local-seo/');
    });

    it('resolves every services.items entry to an explicit href pair, no string-matched fallback', () => {
        for (const item of footerEn.footer.services.items as unknown as { label: string; href: string }[]) {
            expect(typeof item).toBe('object');
            expect(item.label).toBeTruthy();
            expect(item.href).toBeTruthy();
        }
    });
});

/**
 * Link assertions use `getByRole('link', ...)`, not `getByText`: the Agency
 * column has a "Services" link (to the hub) while the third column's heading is
 * also "Services", so a bare text query would match both and throw.
 */
describe('Footer agency links', () => {
    it('links every agency item to its explicit href, EN', async () => {
        const screen = await renderAt('/en/services/');
        expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/en/services/');
        expect(screen.getByRole('link', { name: "Héctor's Card" })).toHaveAttribute('href', '/en/card/hector/');
        expect(screen.getByRole('link', { name: 'Sitemap' })).toHaveAttribute('href', '/en/sitemap/');
        expect(screen.getByRole('link', { name: 'News' })).toHaveAttribute('href', '/en/news/');
        // A homepage anchor, reached from a non-homepage route, has to travel
        // back to the homepage first.
        expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/en#contact');
    });

    it('links every agency item to its explicit href, ES', async () => {
        const screen = await renderAt('/es/services/', 'es');
        expect(screen.getByRole('link', { name: 'Servicios' })).toHaveAttribute('href', '/es/services/');
        expect(screen.getByRole('link', { name: 'Tarjeta de Héctor' })).toHaveAttribute('href', '/es/card/hector/');
        expect(screen.getByRole('link', { name: 'Mapa del sitio' })).toHaveAttribute('href', '/es/sitemap/');
        expect(screen.getByRole('link', { name: 'Noticias' })).toHaveAttribute('href', '/es/news/');
        // The anchor id is the English `contact` in both locales: it is a DOM
        // id on the homepage, not user-facing copy.
        expect(screen.getByRole('link', { name: 'Contacto' })).toHaveAttribute('href', '/es#contact');
    });

    it('uses bare hashes on the home page', async () => {
        const screen = await renderAt('/en/');
        expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '#contact');
        expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '#pricing');
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
        const { container } = await renderAt('/en/');
        const headings = Array.from(container.querySelectorAll('h3'), (h) => h.textContent);
        expect(headings.indexOf('Agency')).toBeLessThan(headings.indexOf('Services'));
    });
});

describe('Footer legal links (unchanged, must not regress)', () => {
    it('still links legal items via {label, href} pairs', async () => {
        const screen = await renderAt('/en/services/');
        expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute('href', '/en/privacy-policy/');
    });

    it('keeps the mailto links after each column', async () => {
        const screen = await renderAt('/en/');
        for (const mail of ['contact', 'sales', 'privacy', 'legal']) {
            expect(screen.getByRole('link', { name: `${mail}@hlorenzoz.com` })).toHaveAttribute('href', `mailto:${mail}@hlorenzoz.com`);
        }
    });
});

describe('Footer social links', () => {
    it('renders LinkedIn, GitHub, and Upwork links with correct attributes', async () => {
        const screen = await renderAt('/en/');
        const githubLink = screen.getByRole('link', { name: 'GitHub' });
        expect(githubLink).toHaveAttribute('href', 'https://github.com/hlorenzoz');
        expect(githubLink).toHaveAttribute('target', '_blank');
        expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
        expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/hlorenzoz/');
        expect(screen.getByRole('link', { name: 'Upwork' })).toHaveAttribute('href', 'https://www.upwork.com/freelancers/hlorenzoz');
    });
});
