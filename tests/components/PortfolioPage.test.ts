import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { within } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import en from '@/messages/en.json';
import PortfolioPage from '@/src/pages/[locale]/portfolio/index.astro';
import PortfolioItemPage, { getStaticPaths } from '@/src/pages/[locale]/portfolio/[slug]/index.astro';
import { getPortfolioItems } from '@/lib/portfolio';

/**
 * The pages render against the real data and catalogue (the Next version mocked
 * both). Route hrefs carry the trailing slash the static build emits.
 */
// Page modules export getStaticPaths, which narrows their props type to `never`.
async function renderPage(Page: unknown, params: Record<string, string>) {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Page as Parameters<AstroContainer['renderToString']>[0], {
        params,
        request: new Request(`https://hlorenzoz.com/${params.locale}/portfolio/${params.slug ? `${params.slug}/` : ''}`),
    });
    const { document } = new JSDOM(html).window;
    return { document, screen: within(document.body) };
}

const renderItemPage = (slug: string) => renderPage(PortfolioItemPage, { locale: 'en', slug });

describe('Portfolio Pages', () => {
    it('renders the Portfolio list page with its translated copy', async () => {
        const { document, screen } = await renderPage(PortfolioPage, { locale: 'en' });

        expect(document.querySelector('#portfolio-hero')).not.toBeNull();
        expect(document.querySelector('#portfolio-grid')).not.toBeNull();

        expect(screen.getByRole('heading', { level: 1, name: en.portfolio.list.title })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: en.portfolio['dental-clinic-1'].title })).toBeInTheDocument();
    });

    it('renders one card per portfolio entry, each linking to its detail page', async () => {
        const { document } = await renderPage(PortfolioPage, { locale: 'en' });
        const cards = document.querySelectorAll('#portfolio-grid [data-portfolio-type]');
        const items = getPortfolioItems();
        expect(cards).toHaveLength(items.length);
        items.forEach((item, i) => {
            expect(cards[i].getAttribute('data-portfolio-type')).toBe(item.type);
            expect(cards[i].querySelector('a')?.getAttribute('href')).toBe(`/en/portfolio/${item.slug}/`);
        });
    });

    it('renders the Portfolio detail page sections and copy', async () => {
        const { document, screen } = await renderItemPage('dental-clinic-1');

        expect(document.querySelector('#portfolio-hero')).not.toBeNull();
        expect(document.querySelector('#portfolio-showcase')).not.toBeNull();
        expect(document.querySelector('#portfolio-cta')).not.toBeNull();

        expect(screen.getAllByText(en.portfolio['dental-clinic-1'].badge).length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { level: 1, name: en.portfolio['dental-clinic-1'].heroTitle })).toBeInTheDocument();
    });

    it('points the quote CTAs to the external bookingUrl when provided', async () => {
        const { document } = await renderItemPage('malaga-event-gear');

        // Bottom CTA section holds a single anchor: the booking button.
        const ctaLink = document.querySelector('#portfolio-cta a');
        expect(ctaLink?.getAttribute('href')).toBe('https://malagaeventgear.com/packages/');
        expect(ctaLink?.getAttribute('target')).toBe('_blank');
        expect(ctaLink?.getAttribute('rel')).toContain('noopener');

        // Hero quote button is external too.
        const heroBooking = document.querySelector('#portfolio-hero a[href="https://malagaeventgear.com/packages/"]');
        expect(heroBooking).not.toBeNull();
        expect(heroBooking?.getAttribute('target')).toBe('_blank');
    });

    it('falls back to the local contact section when no bookingUrl is set', async () => {
        const { document } = await renderItemPage('dental-clinic-1');
        const ctaLink = document.querySelector('#portfolio-cta a');
        // What the Next build emitted in out/en/portfolio/dental-clinic-1/.
        expect(ctaLink?.getAttribute('href')).toBe('/en/#contact');
        expect(ctaLink?.getAttribute('target')).toBeNull();
    });

    it('renders the showcase description markup as a link to the live site', async () => {
        const { document } = await renderItemPage('malaga-event-gear');
        const link = document.querySelector('#portfolio-showcase p a');
        expect(link?.getAttribute('href')).toBe('https://malagaeventgear.com/');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(document.querySelector('#portfolio-showcase p')?.innerHTML).not.toContain('<meg>');
    });

    it('fails the build on an unknown slug instead of rendering an empty page', async () => {
        await expect(renderItemPage('invalid-slug')).rejects.toThrow(/Unknown portfolio slug: invalid-slug/);
    });

    it('generates static params for every locale and entry', async () => {
        const paths = await getStaticPaths();
        const items = getPortfolioItems();
        expect(paths).toHaveLength(items.length * 2);
        expect(paths[0].params).toHaveProperty('locale');
        expect(paths[0].params).toHaveProperty('slug');
    });
});
