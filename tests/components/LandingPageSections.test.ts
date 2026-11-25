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

    it('renders the Pricing section', () => {
        expect(screen.getByText(home.pricing.title)).toBeInTheDocument();
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

    const OFFER_SLUGS = ['local-seo', 'website-development', 'ai-voice-receptionist', 'software-development'];

    it('prices one core plan and three optional services, each with a learn-more link', () => {
        const learnMoreLinks = $$('#pricing [data-testid="pricing-learn-more"]');
        expect(learnMoreLinks).toHaveLength(4);
        // Core offer first, then the optional services in presentation order.
        OFFER_SLUGS.forEach((slug, i) => {
            expect(learnMoreLinks[i]).toHaveAttribute('href', `/en/services/${slug}/`);
        });
        // Every card keeps its #contact conversion CTA.
        expect($$('#pricing a[href="#contact"]')).toHaveLength(4);
    });

    /**
     * Asserts the accessible NAME, not the mechanism that produces it.
     *
     * This used to require an `aria-label`, alongside an `sr-only` span
     * carrying the same sentence. `aria-label` overrides descendant text when
     * the accessible name is computed, so the span was dead weight for
     * assistive tech while the two strings were free to drift apart. The span
     * alone now carries the service name: it names the link for a screen
     * reader AND lands in `textContent`, which is what Lighthouse's
     * `link-text` audit reads.
     */
    it('gives each "Learn more" link a descriptive name, not a bare "Learn more"', () => {
        const learnMoreLinks = $$('[data-testid="pricing-learn-more"]');
        expect(learnMoreLinks).toHaveLength(4);

        learnMoreLinks.forEach((link) => {
            const name = (link.textContent ?? '').trim();
            expect(name).not.toBe(home.pricing.learnMore);
            expect(name.length).toBeGreaterThan(home.pricing.learnMore.length);
            // One source for the name: no aria-label competing with the text.
            expect(link).not.toHaveAttribute('aria-label');
        });
    });

    /**
     * Every published price is before tax, and the dossier marks each one. A
     * figure on the home page without the marker would state a different total
     * for the same offer.
     */
    it('marks every price as before tax', () => {
        const marks = (selector: string) => $$(`${selector} [data-testid="tax-mark"]`);
        // The plan's price in the stats band.
        expect(marks('#stats')).toHaveLength(1);
        // Two former list prices, their total and the plan.
        expect(marks('#numbers')).toHaveLength(4);
        // The core plan and the three optional services.
        expect(marks('#pricing')).toHaveLength(4);
    });

    it('strikes the list price of each optional service and shows the bundled one', () => {
        const list = Array.from($$('[data-testid="addon-list-price"]')).map((n) => n.textContent);
        const bundle = Array.from($$('[data-testid="addon-bundle-price"]')).map((n) => n.textContent);
        // Straight from PRICING: 2500 / 350 / 20000, and 30% off each.
        expect(list).toEqual(['€2,500', '€350', '€20,000']);
        expect(bundle).toEqual(['€1,750', '€245', '€14,000']);
        // Only software is a floor.
        expect($$('[data-testid="addon-from"]')).toHaveLength(1);
    });

    it('shows the plan at its published price', () => {
        expect($('[data-testid="core-plan-price"]')).toHaveTextContent('€750');
        expect($('[data-testid="stat-plan-price"]')).toHaveTextContent('€750');
    });

    it('never advertises a free trial or a limited-time offer', () => {
        expect(document.body.textContent).not.toMatch(/trial|limited time/i);
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
            'solutions', 'numbers', 'portfolio', 'benefits', 'process',
            'pricing', 'contact', 'faq',
        ];

        requiredIds.forEach((id) => {
            expect($(`#${id}`), `ID #${id} should exist`).not.toBeNull();
        });
    });

    it('emits the page JSON-LD in the Next order, then the layout organization graph', () => {
        const blocks = Array.from($$('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!));
        expect(blocks).toHaveLength(5);
        expect(blocks[0]['@graph'][0]['@type']).toBe('WebPage');
        expect(blocks[1]['@type']).toBe('ItemList');
        expect(blocks[2]['@id']).toBe('https://hlorenzoz.com/#organization');
        expect(blocks[3]['@type']).toBe('FAQPage');
        expect(blocks[4]['@graph'][0]['@id']).toBe('https://hlorenzoz.com/#organization');
    });
});
