import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as reactRenderer } from '@astrojs/react';
import { loadRenderers } from 'astro:container';
import { within } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import messages from '@/messages/en.json';
import Page from '@/src/pages/[locale]/index.astro';
import { LOCALES } from '@/lib/routing';
import { SERVED_MARKETS } from '@/lib/site-config';

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

describe('HomePage: partner positioning landing', () => {
    it('leads with the partner hero, the free needs analysis CTA and its microcopy', () => {
        expect($('h1')).toHaveTextContent(`${home.hero.title} ${home.hero.titleGradient}`);
        expect(screen.getByText(home.hero.description)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: home.hero.cta })).toHaveAttribute('href', '#contact');
        expect(screen.getByText(home.hero.note)).toBeInTheDocument();
    });

    it('offers the dossier as a PDF download in the page language', () => {
        const link = screen.getByRole('link', { name: home.dossier.cta });
        expect(link).toHaveAttribute('href', '/dossier/lorenzoz-agency-dossier-en.pdf');
        expect(link).toHaveAttribute('download');
        expect(screen.getByText(home.dossier.title)).toBeInTheDocument();
    });

    it('points the secondary hero link at the How we work section, which exists', () => {
        const link = $('#home')!.querySelector('a[href="#how"]');
        expect(link).toHaveTextContent(home.hero.secondaryCta);
        expect($('#how')).not.toBeNull();
    });

    it('states verifiable facts: services and languages counted from data, the checkable PageSpeed score', () => {
        const facts = $('#facts')!;
        expect(facts).toHaveTextContent('4 services');
        expect(facts).toHaveTextContent(`${LOCALES.length} languages`);
        expect(facts).toHaveTextContent(home.facts.pageSpeed.value);
        expect(facts).toHaveTextContent(home.facts.markets.value);
        const verify = within(facts as HTMLElement).getByRole('link', { name: home.facts.pageSpeed.link });
        expect(verify).toHaveAttribute('href', 'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fhlorenzoz.com%2F');
    });

    it('lists every served market beside the facts', () => {
        expect($$('#facts li[data-market]')).toHaveLength(SERVED_MARKETS.length);
        expect(screen.getByText(home.markets.title)).toBeInTheDocument();
    });

    it('renders four problem cards, the website first, and the problem title markup', () => {
        expect(Array.from($$('#problem h3')).map((h) => h.textContent?.trim())).toEqual([
            'A website that does not convert',
            'Invisible on Google',
            'AI recommends someone else',
            'Calls nobody answers',
        ]);
        const title = $('#problem h2')!;
        expect(title.querySelector('span.relative.inline-block > span.bg-red-600')).not.toBeNull();
        expect(title.innerHTML).not.toMatch(/<trad>|&lt;/);
    });

    it('contrasts buying services with working with a partner', () => {
        const partner = $('#partner')!;
        expect(partner.querySelector('h2')).toHaveTextContent(home.partner.title);
        for (const item of [...home.partner.services.items, ...home.partner.partner.items]) {
            expect(partner).toHaveTextContent(item);
        }
    });

    it('explains how we work in four numbered steps and states there is no price list', () => {
        const how = $('#how')!;
        const steps = how.querySelectorAll('ol > li');
        expect(steps).toHaveLength(4);
        expect(steps[0]).toHaveTextContent('01');
        expect(steps[3]).toHaveTextContent('04');
        expect(how).toHaveTextContent(home.how.note);
    });

    it('links each of the four solutions to its own service page, Website Development first', () => {
        const hrefs = Array.from($$('#solutions a')).map((a) => a.getAttribute('href'));
        expect(hrefs).toEqual([
            '/en/services/website-development/',
            '/en/services/local-seo/',
            '/en/services/ai-voice-receptionist/',
            '/en/services/software-development/',
        ]);
        expect(screen.getByText(messages.services.aiVoiceReceptionist.name, { selector: '#solutions h3' })).toBeInTheDocument();
    });

    it('keeps the portfolio carousel and the benefits section', () => {
        expect($('#portfolio')).not.toBeNull();
        expect($$('#benefits h3')).toHaveLength(home.benefits.items.length);
    });

    it('renders the CalBooking component in the contact section instead of an inline iframe', () => {
        const iframe = $('#contact iframe');
        expect(iframe).not.toBeNull();
        expect(iframe).toHaveAttribute('src', 'https://cal.com/hlorenzoz.com/15min?embed=true');
        expect(iframe).toHaveAttribute('loading', 'lazy');
        expect($('#contact')).toHaveTextContent(home.contact.note);
    });

    it('answers the five FAQ questions, with the up front share filled in', () => {
        const faq = $('#faq')!;
        expect(faq.querySelectorAll('button[aria-controls]')).toHaveLength(5);
        expect(faq).toHaveTextContent('50% of the agreed quote');
        expect(faq.textContent).not.toMatch(/\{upfront\}/);
    });

    it('renders the News carousel directly above the LinkedIn articles, below the FAQ', () => {
        const news = $('#news');
        const articles = $('#articles');
        expect(news).not.toBeNull();
        expect(news!.nextElementSibling).toBe(articles);
        expect(news!.querySelectorAll('li a[href^="/en/news/"]').length).toBeGreaterThan(0);
        expect($('#faq')!.compareDocumentPosition(news!) & 4).toBeTruthy();
    });

    it('orders the sections as the approved design does', () => {
        const ids = Array.from($$('main > section[id]')).map((s) => s.id);
        expect(ids).toEqual([
            'home', 'facts', 'problem', 'partner', 'how', 'solutions',
            'portfolio', 'benefits', 'contact', 'faq', 'news', 'articles',
        ]);
    });

    it('publishes no price, no pricing section and no free trial', () => {
        expect($('#pricing')).toBeNull();
        expect($('#numbers')).toBeNull();
        expect(document.body.textContent).not.toMatch(/€\s?\d|\d\s?€/);
        expect(document.body.textContent).not.toMatch(/trial|limited time/i);
    });

    it('never promises a Google position: the FAQ says so plainly', () => {
        expect(document.body.textContent).not.toMatch(/\bwe guarantee\b|guaranteed (first|top)/i);
        const answer = home.faq.items.find((item) => /first position on Google/.test(item.question))!.answer;
        expect(answer).toMatch(/^No\b/);
        expect($('#faq')).toHaveTextContent(answer);
    });

    it('emits the page JSON-LD in order, the FAQ from the rewritten copy, then the organization graph', () => {
        const blocks = Array.from($$('script[type="application/ld+json"]')).map((s) => JSON.parse(s.textContent!));
        expect(blocks).toHaveLength(4);
        expect(blocks[0]['@graph'][0]['@type']).toBe('WebPage');
        expect(blocks[1]['@type']).toBe('ItemList');
        expect(blocks[2]['@type']).toBe('FAQPage');
        expect(blocks[2].mainEntity.map((q: { name: string }) => q.name)).toEqual(home.faq.items.map((i) => i.question));
        expect(blocks[3]['@graph'][0]['@id']).toBe('https://hlorenzoz.com/#organization');
        expect(JSON.stringify(blocks)).not.toMatch(/"offers"|"priceRange"/);
    });
});
