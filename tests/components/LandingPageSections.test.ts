import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as reactRenderer } from '@astrojs/react';
import { loadRenderers } from 'astro:container';
import { within } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import messages from '@/messages/en.json';
import Page from '@/src/pages/[locale]/index.astro';

// Pages are typed with `never` props; the container takes any component factory.
const HomePage = Page as unknown as Parameters<AstroContainer['renderToString']>[0];

const home = messages.home;

/**
 * Renders the real home page (layout included) once: every assertion below is
 * about static output, so there is nothing to re-render between tests. Needs
 * the `[locale]` param, which `renderAstro()` does not pass.
 */
let document: Document;
let screen: ReturnType<typeof within>;
const $ = (selector: string) => document.querySelector(selector);
const $$ = (selector: string) => document.querySelectorAll(selector);

beforeAll(async () => {
    const container = await AstroContainer.create({ renderers: await loadRenderers([reactRenderer()]) });
    const html = await container.renderToString(HomePage, { params: { locale: 'en' } });
    document = new JSDOM(html).window.document;
    screen = within(document.body);
});

describe('HomePage Sections', () => {
    it('renders the Hero section with correct translations', () => {
        expect($('h1')).toHaveTextContent(`${home.hero.title} ${home.hero.titleGradient}`);
        expect(screen.getByText(home.hero.description)).toBeInTheDocument();
    });

    it('renders the Solutions section with all cards', () => {
        expect(screen.getByText(home.solutions.title)).toBeInTheDocument();
        home.solutions.items.forEach((item) => {
            expect(screen.getAllByText(item.title).length).toBeGreaterThan(0);
        });
    });

    it('renders the problem title markup: the struck word and the line break', () => {
        const title = $('#problem h2')!;
        expect(title.querySelector('span.relative.inline-block > span.bg-red-600')).not.toBeNull();
        expect(title.querySelector('br')).not.toBeNull();
        expect(title.innerHTML).not.toMatch(/<trad>|&lt;/);
    });

    it('renders the News carousel directly above the LinkedIn articles', () => {
        const news = $('#news');
        const articles = $('#articles');
        expect(news).not.toBeNull();
        expect(articles).not.toBeNull();
        expect(news!.nextElementSibling).toBe(articles);
        expect(news!.querySelectorAll('li a[href^="/en/news/"]').length).toBeGreaterThan(0);
    });

    it('renders FAQ section', () => {
        expect(screen.getByText(home.faq.title)).toBeInTheDocument();
    });

    it('links the solutions CTA to the Local SEO page, not #contact', () => {
        const cta = screen.getByText(home.solutions.cta).closest('a');
        // The section presents the four pillars of one offer, so its "see more"
        // leads to that offer's page. It used to open the services directory,
        // back when the section listed three separate services. The trailing
        // slash is what `localeHref` emits and what the static export served.
        expect(cta).toHaveAttribute('href', '/en/services/local-seo/');
    });

    it('renders the four pillars, each linking to the Local SEO page', () => {
        const cards = $$('[data-testid="solutions-card-link"]');
        // Four pillars of ONE offer. They are not services with pages of their
        // own, so every card leads to the same place.
        expect(cards).toHaveLength(4);
        cards.forEach((card) => {
            expect(card).toHaveAttribute('href', '/en/services/local-seo/');
        });
    });

    it('never advertises a free trial or a limited-time offer', () => {
        expect(document.body.textContent).not.toMatch(/trial|limited time/i);
    });

    it('publishes no price and no pricing section', () => {
        expect($('#pricing')).toBeNull();
        expect($('#numbers')).toBeNull();
        expect(document.body.textContent).not.toMatch(/€\s?\d|\d\s?€/);
    });

    it('points the secondary hero link at the process section, which exists', () => {
        const link = screen.getByRole('link', { name: home.hero.secondaryCta });
        expect(link).toHaveAttribute('href', '#process');
        expect($('#process')).not.toBeNull();
    });

    it('renders the CalBooking component in the contact section instead of an inline iframe', () => {
        const iframe = $('#contact iframe');
        expect(iframe).not.toBeNull();
        expect(iframe).toHaveAttribute('src', 'https://cal.com/hlorenzoz.com/15min?embed=true');
        expect(iframe).toHaveAttribute('loading', 'lazy');
    });

    it('contains all required section IDs for navigation', () => {
        const requiredIds = [
            'home', 'stats', 'markets', 'standard', 'problem',
            'solutions', 'portfolio', 'benefits', 'process',
            'contact', 'faq',
        ];

        requiredIds.forEach((id) => {
            expect($(`#${id}`), `ID #${id} should exist`).not.toBeNull();
        });
    });

    it('emits the page JSON-LD in the Next order, then the layout organization graph', () => {
        const blocks = Array.from($$('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!));
        expect(blocks).toHaveLength(4);
        expect(blocks[0]['@graph'][0]['@type']).toBe('WebPage');
        expect(blocks[1]['@type']).toBe('ItemList');
        expect(blocks[2]['@type']).toBe('FAQPage');
        expect(blocks[3]['@graph'][0]['@id']).toBe('https://hlorenzoz.com/#organization');
    });
});
