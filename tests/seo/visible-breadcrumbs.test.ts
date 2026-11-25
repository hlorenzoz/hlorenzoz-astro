/**
 * Google's structured data policy: "Don't mark up content that is not visible
 * to readers of the page." Every page that emits a BreadcrumbList must show the
 * same trail, so this renders each page type and holds the visible crumbs to
 * the JSON-LD ones: same names, same order, same targets.
 */
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import { jsonLdNodes, renderPage } from './render-page';
import HomePage from '@/src/pages/[locale]/index.astro';
import NewsPage from '@/src/pages/[locale]/news/index.astro';
import NewsPostPage from '@/src/pages/[locale]/news/[slug]/index.astro';
import PortfolioPage from '@/src/pages/[locale]/portfolio/index.astro';
import PortfolioItemPage from '@/src/pages/[locale]/portfolio/[slug]/index.astro';
import PrivacyPolicyPage from '@/src/pages/[locale]/privacy-policy/index.astro';
import TermsPage from '@/src/pages/[locale]/terms-conditions/index.astro';
import CookiePolicyPage from '@/src/pages/[locale]/cookie-policy/index.astro';
import SitemapPage from '@/src/pages/[locale]/sitemap/index.astro';
import ServicesHubPage from '@/src/pages/[locale]/services/index.astro';
import LocalSeoPage from '@/src/pages/[locale]/services/local-seo/index.astro';
import WebsiteDevelopmentPage from '@/src/pages/[locale]/services/website-development/index.astro';
import AiVoiceReceptionistPage from '@/src/pages/[locale]/services/ai-voice-receptionist/index.astro';
import SoftwareDevelopmentPage from '@/src/pages/[locale]/services/software-development/index.astro';

type ListItem = { name: string; item: string };

const LABELS: Record<string, string> = { en: en.navigation.breadcrumb, es: es.navigation.breadcrumb };

function schemaCrumbs(document: Document): ListItem[] | undefined {
    const node = jsonLdNodes(document).find((n) => n['@type'] === 'BreadcrumbList');
    return node?.itemListElement as ListItem[] | undefined;
}

function visibleNav(document: Document, locale: string) {
    return document.querySelector(`nav[aria-label="${LABELS[locale]}"]`);
}

const PAGES: [string, unknown, string][] = [
    ['news listing', NewsPage, ''],
    ['news post', NewsPostPage, 'masajes-orisha-in-portfolio'],
    ['portfolio listing', PortfolioPage, ''],
    ['portfolio detail', PortfolioItemPage, 'masajes-orisha'],
    ['privacy policy', PrivacyPolicyPage, ''],
    ['terms and conditions', TermsPage, ''],
    ['cookie policy', CookiePolicyPage, ''],
    ['HTML sitemap', SitemapPage, ''],
    ['services hub', ServicesHubPage, ''],
    ['local seo', LocalSeoPage, ''],
    ['website development', WebsiteDevelopmentPage, ''],
    ['ai voice receptionist', AiVoiceReceptionistPage, ''],
    ['software development', SoftwareDevelopmentPage, ''],
];

describe.each(['en', 'es'])('visible breadcrumb (%s)', (locale) => {
    it.each(PAGES)('%s shows the same trail its BreadcrumbList declares', async (_name, Page, slug) => {
        const document = await renderPage(Page, slug ? { locale, slug } : { locale });
        const schema = schemaCrumbs(document);
        expect(schema, 'page emits a BreadcrumbList').toBeDefined();

        const nav = visibleNav(document, locale);
        expect(nav, 'page renders a visible breadcrumb').not.toBeNull();
        const items = [...nav!.querySelectorAll('ol > li')];
        expect(items.map((li) => li.textContent?.trim())).toEqual(schema!.map((c) => c.name));

        // Every crumb but the current page links to the JSON-LD `item`, as a
        // site-relative path with the canonical trailing slash.
        const hrefs = items.slice(0, -1).map((li) => li.querySelector('a')?.getAttribute('href'));
        expect(hrefs).toEqual(schema!.slice(0, -1).map((c) => new URL(c.item).pathname));
        expect(items.at(-1)!.querySelector('a')).toBeNull();
        expect(items.at(-1)!.querySelector('[aria-current="page"]')).not.toBeNull();
    });
});

describe('home page', () => {
    it('renders no visible breadcrumb', async () => {
        const document = await renderPage(HomePage, { locale: 'en' });
        expect(visibleNav(document, 'en')).toBeNull();
    });
});
