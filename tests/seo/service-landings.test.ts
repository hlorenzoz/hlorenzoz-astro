import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import LocalSeo from '@/src/pages/[locale]/services/local-seo/index.astro';
import WebsiteDevelopment from '@/src/pages/[locale]/services/website-development/index.astro';
import AiVoiceReceptionist from '@/src/pages/[locale]/services/ai-voice-receptionist/index.astro';
import SoftwareDevelopment from '@/src/pages/[locale]/services/software-development/index.astro';
import { jsonLdNodes, renderPage } from './render-page';

/**
 * The four service pages are landing pages built from the approved designs
 * (odd/tasks/partner-positioning.md, S1 and S4): one promise, proof the
 * visitor can check, a free needs analysis as the only call to action, the
 * dossier, and the booking calendar last.
 */
const PAGESPEED = 'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fhlorenzoz.com%2F';
const RICH_RESULTS = 'https://search.google.com/test/rich-results?url=https%3A%2F%2Fhlorenzoz.com%2F';

const PAGES = [
    {
        path: 'services/website-development',
        Page: WebsiteDevelopment,
        key: 'websiteDevelopment',
        sections: [
            'Real businesses, live sites you can open today',
            'What every site includes',
            'Speed is the first thing your customers notice',
            'Google reads your business, not just your words',
            "Your own app on your customers' phones, without an app store",
            'Speak to every customer in their own language',
            'A briefing written for AI assistants',
            'The complete package',
            'How we build your site',
            'Frequently asked questions',
            'Want it all in one document?',
            'A website that proves itself, live in two weeks',
        ],
        links: [PAGESPEED, RICH_RESULTS, '/llms.txt', '/en/portfolio/'],
    },
    {
        path: 'services/local-seo',
        Page: LocalSeo,
        key: 'localSeo',
        sections: [
            'We look at your market before we touch anything',
            'Four fronts, moving forward together',
            'Give Google the facts, not guesses',
            'Recommended in AI answers, not only on Google',
            'More reviews, gathered the right way',
            'How we work together',
            'Frequently asked questions',
            'Want it all in one document?',
            'Find out where you stand in your area',
        ],
        links: [PAGESPEED, RICH_RESULTS, '/llms.txt'],
    },
    {
        path: 'services/ai-voice-receptionist',
        Page: AiVoiceReceptionist,
        key: 'aiVoiceReceptionist',
        sections: [
            'The calls you miss today become customers',
            'Your voice, your script, your way of doing things',
            'We stay with it after launch',
            'From first call to first answered call',
            'Frequently asked questions',
            'Want it all in one document?',
            'Stop losing calls, starting this month',
        ],
        links: ['/en/#process'],
    },
    {
        path: 'services/software-development',
        Page: SoftwareDevelopment,
        key: 'softwareDevelopment',
        sections: [
            'Investep App: one codebase, every screen',
            'Built like a product, not a prototype',
            'How to scale a single codebase to every device',
            'From idea to product',
            'Frequently asked questions',
            'Want it all in one document?',
            'Tell us what you need to build',
        ],
        links: [
            'https://investep.hlorenzoz.com/',
            '/en/portfolio/investep-app/',
            'https://www.linkedin.com/pulse/how-scale-single-codebase-every-device-inside-modern-hector-luis-7vt0e',
        ],
    },
] as const;

const render = (Page: unknown, path: string) => renderPage(Page, { locale: 'en' }, `/en/${path}/`);
/** The page's own <main>: BaseLayout wraps every page, footer included, in an outer one. */
const MAIN = 'main main';
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim();

describe.each(PAGES)('$path landing', ({ path, Page, key, sections, links }) => {
    it('renders the design sections in order', async () => {
        const document = await render(Page, path);
        expect([...document.querySelectorAll(`${MAIN} h2`)].map(text)).toEqual(sections);
    });

    it('leads with the free needs analysis, linked to the booking calendar, and its microcopy', async () => {
        const document = await render(Page, path);
        const hero = document.querySelector(`${MAIN} h1`)!.closest('section')!;
        const cta = [...hero.querySelectorAll('a')].find((a) => text(a) === 'Book your free needs analysis');
        expect(cta?.getAttribute('href')).toBe(`/en/${path}/#booking`);
        expect(text(hero)).toContain('15 minutes by video call. No obligation.');
    });

    it('keeps the breadcrumb trail above the hero', async () => {
        const document = await render(Page, path);
        const nav = document.querySelector(`${MAIN} nav[aria-label]`);
        expect(nav?.textContent).toContain('Home');
        expect(nav!.compareDocumentPosition(document.querySelector(`${MAIN} h1`)!) & 4).toBeTruthy();
    });

    it('offers the dossier as a download in the reader language', async () => {
        const document = await render(Page, path);
        const link = document.querySelector(`${MAIN} a[download]`);
        expect(link?.getAttribute('href')).toBe('/dossier/lorenzoz-agency-dossier-en.pdf');
        expect(text(link)).toBe('Download the dossier (PDF)');
    });

    it('ends with the booking section and the Cal.com calendar', async () => {
        const document = await render(Page, path);
        const booking = document.querySelector(`${MAIN} section#booking`);
        expect(booking?.querySelector('iframe[src^="https://cal.com/"]')).not.toBeNull();
        expect(text(booking)).toContain('Video call. No obligation.');
        expect(document.querySelector(MAIN)?.lastElementChild?.id).toBe('booking');
    });

    it('links to the proof a visitor can check', async () => {
        const document = await render(Page, path);
        const hrefs = [...document.querySelectorAll(`${MAIN} a`)].map((a) => a.getAttribute('href'));
        for (const href of links) expect(hrefs, href).toContain(href);
    });

    it('gives every image a translated alt text', async () => {
        const document = await render(Page, path);
        for (const img of document.querySelectorAll(`${MAIN} img`)) expect(img.getAttribute('alt')?.trim()).toBeTruthy();
    });

    it('keeps the FAQ in the structured data, from the page copy', async () => {
        const document = await render(Page, path);
        const faq = jsonLdNodes(document).find((n) => n['@type'] === 'FAQPage') as { mainEntity: { name: string }[] } | undefined;
        const items = (en.services as unknown as Record<string, { faq: { items: { question: string }[] } }>)[key].faq.items;
        expect(faq?.mainEntity.map((q) => q.name)).toEqual(items.map((i) => i.question));
    });
});

describe('Website Development proof', () => {
    it('shows each live client site, newest first like the portfolio, linked to its case study, and not the agency itself', async () => {
        const document = await render(WebsiteDevelopment, 'services/website-development');
        const cards = [...document.querySelectorAll('#proof li a')].map((a) => a.getAttribute('href'));
        expect(cards).toEqual([
            '/en/news/gerp-dj-case-study/',
            '/en/news/masajes-orisha-case-study/',
            '/en/news/vicron-lopez-case-study/',
            '/en/news/malaga-event-gear-study/',
        ]);
    });

    it('shows the real llms.txt file, not a copy of it', async () => {
        const document = await render(WebsiteDevelopment, 'services/website-development');
        expect(document.querySelector(`${MAIN} pre`)?.textContent).toContain('# Lorenzoz Agency');
    });

    it('lists all nine languages the site is published in', async () => {
        const document = await render(WebsiteDevelopment, 'services/website-development');
        expect(document.querySelectorAll('[data-language-chips] li')).toHaveLength(9);
    });
});

describe('AI Voice Receptionist demo', () => {
    it('offers a button that opens the site assistant', async () => {
        const document = await render(AiVoiceReceptionist, 'services/ai-voice-receptionist');
        const button = document.querySelector('#try button[data-assistant-open]');
        expect(text(button)).toBe('Start a conversation');
    });
});
