/**
 * "About the business" on a portfolio detail page: who the client is, in its
 * own terms, before the page talks about the website. Only real client sites
 * (`type: 'live'`) have a business to describe; demos render nothing new.
 */
import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { renderAstro } from '@/tests/helpers/render';
import PortfolioBusiness from '@/src/components/PortfolioBusiness.astro';
import PortfolioItemPage from '@/src/pages/[locale]/portfolio/[slug]/index.astro';
import en from '@/messages/en.json';

type AstroPage = Parameters<AstroContainer['renderToString']>[0];

describe('PortfolioBusiness', () => {
    it('renders a level 2 heading and every paragraph', async () => {
        const screen = await renderAstro(PortfolioBusiness, { title: 'About GERP DJ', paragraphs: ['First.', 'Second.'] });
        expect(screen.getByRole('heading', { level: 2, name: 'About GERP DJ' })).toBeInTheDocument();
        expect(screen.getByText('First.')).toBeInTheDocument();
        expect(screen.getByText('Second.')).toBeInTheDocument();
    });

    it('labels its section with the heading', async () => {
        const screen = await renderAstro(PortfolioBusiness, { title: 'About GERP DJ', paragraphs: ['First.'] });
        expect(screen.getByRole('region', { name: 'About GERP DJ' })).toBeInTheDocument();
    });

    it('renders nothing without copy', async () => {
        const { html } = await renderAstro(PortfolioBusiness, { title: 'About', paragraphs: [] });
        expect(html.trim()).toBe('');
    });
});

describe('portfolio detail page: business section', () => {
    const renderItemPage = async (slug: string) => {
        const container = await AstroContainer.create();
        // Page modules export getStaticPaths, which narrows their props type to `never`.
        const html = await container.renderToString(PortfolioItemPage as unknown as AstroPage, {
            params: { locale: 'en', slug },
            request: new Request(`https://hlorenzoz.com/en/portfolio/${slug}/`),
        });
        return new JSDOM(html).window.document;
    };

    it('renders on a live entry', async () => {
        const document = await renderItemPage('gerp-dj');
        const section = document.querySelector('#portfolio-business');
        expect(section).not.toBeNull();
        // Real catalogue, not an identity mock: the copy is the entry's own.
        expect(section!.querySelector('h2')?.textContent?.trim()).toBe(en.portfolio['gerp-dj'].business.title);
        expect(section!.querySelectorAll('p').length).toBe(en.portfolio['gerp-dj'].business.paragraphs.length);
    });

    it('sits between the hero and the CTA', async () => {
        const document = await renderItemPage('gerp-dj');
        const ids = [...document.querySelectorAll('main > section, main > div[id]')].map((el) => el.id);
        expect(ids.indexOf('portfolio-business')).toBe(ids.indexOf('portfolio-hero') + 1);
        expect(ids.indexOf('portfolio-business')).toBeLessThan(ids.indexOf('portfolio-cta'));
    });

    it('does not render on a demo entry', async () => {
        const document = await renderItemPage('dental-clinic-1');
        expect(document.querySelector('#portfolio-business')).toBeNull();
    });
});
