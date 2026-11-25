/**
 * Every registered page renders in every locale it is published in, with the
 * head and links the rollout rule demands.
 *
 * This is the guard for the page by page translation: a locale is published
 * for a page as soon as its messages hold the route's `copyKeys`
 * (`lib/routes.ts`). If those keys miss something the page renders, the
 * translator throws on the missing message here (tests run in dev mode),
 * instead of a production build quietly printing the key's last segment.
 *
 * It also pins what each published page says about the others: hreflang lists
 * exactly the locales the page exists in, the language switcher offers only
 * those, and no internal link points at a page not built in its locale.
 */
import { describe, it, expect } from 'vitest';
import { headFacts, renderPage } from './render-page';
import { ALL_ROUTES, routeAlternates, routeExists } from '@/lib/routes';
import { LOCALE_INFO, LOCALES } from '@/lib/site-config';
import HomePage from '@/src/pages/[locale]/index.astro';
import ServicesHub from '@/src/pages/[locale]/services/index.astro';
import LocalSeo from '@/src/pages/[locale]/services/local-seo/index.astro';
import WebsiteDevelopment from '@/src/pages/[locale]/services/website-development/index.astro';
import AiVoiceReceptionist from '@/src/pages/[locale]/services/ai-voice-receptionist/index.astro';
import SoftwareDevelopment from '@/src/pages/[locale]/services/software-development/index.astro';
import PortfolioList from '@/src/pages/[locale]/portfolio/index.astro';
import PortfolioDetail from '@/src/pages/[locale]/portfolio/[slug]/index.astro';
import NewsList from '@/src/pages/[locale]/news/index.astro';
import NewsDetail from '@/src/pages/[locale]/news/[slug]/index.astro';
import CardPage from '@/src/pages/[locale]/card/hector/index.astro';
import SitemapPage from '@/src/pages/[locale]/sitemap/index.astro';
import PrivacyPage from '@/src/pages/[locale]/privacy-policy/index.astro';
import TermsPage from '@/src/pages/[locale]/terms-conditions/index.astro';
import CookiePage from '@/src/pages/[locale]/cookie-policy/index.astro';

const STATIC_PAGES: Record<string, unknown> = {
    '': HomePage,
    services: ServicesHub,
    'services/local-seo': LocalSeo,
    'services/website-development': WebsiteDevelopment,
    'services/ai-voice-receptionist': AiVoiceReceptionist,
    'services/software-development': SoftwareDevelopment,
    portfolio: PortfolioList,
    news: NewsList,
    'card/hector': CardPage,
    sitemap: SitemapPage,
    'privacy-policy': PrivacyPage,
    'terms-conditions': TermsPage,
    'cookie-policy': CookiePage,
};

/** The page module and params for a registered path. */
function pageFor(path: string, locale: string): { Page: unknown; params: Record<string, string> } {
    const [, hub, slug] = path.match(/^(portfolio|news)\/(.+)$/) ?? [];
    if (hub) return { Page: hub === 'portfolio' ? PortfolioDetail : NewsDetail, params: { locale, slug } };
    const Page = STATIC_PAGES[path];
    if (!Page) throw new Error(`No page module mapped for route "${path}"`);
    return { Page, params: { locale } };
}

const CASES = ALL_ROUTES.flatMap((route) => route.locales.map((locale) => [route.path || '(home)', locale, route.path] as const));
const LOCALE_PATH = new RegExp(`^/(${LOCALES.join('|')})/(.*?)/?(?:#.*)?$`);

describe('every page in every locale it is published in', () => {
    it('maps every registered route to a page module', () => {
        for (const route of ALL_ROUTES) expect(() => pageFor(route.path, 'en')).not.toThrow();
    });

    it.each(CASES)('%s in %s renders with its hreflang, switcher and links consistent', async (_label, locale, path) => {
        const { Page, params } = pageFor(path, locale);
        const document = await renderPage(Page, params, `/${locale}/${path ? `${path}/` : ''}`);

        expect(document.documentElement.getAttribute('lang')).toBe(LOCALE_INFO[locale].tag);
        expect(headFacts(document).languages).toEqual(routeAlternates(path));

        const route = ALL_ROUTES.find((r) => r.path === path)!;
        const offered = [...document.querySelectorAll('[data-testid^="lang-option-"]')].map((a) =>
            a.getAttribute('data-testid')!.replace('lang-option-', '')
        );
        // The card page renders no Navbar, so it has no switcher.
        if (offered.length > 0) expect(offered).toEqual(route.locales);

        for (const a of document.querySelectorAll('a[href^="/"]')) {
            const href = a.getAttribute('href')!;
            const match = href.match(LOCALE_PATH);
            if (!match) continue;
            expect(routeExists(match[2], match[1]), `${href} on /${locale}/${path} links to an unbuilt page`).toBe(true);
        }
    });
});
