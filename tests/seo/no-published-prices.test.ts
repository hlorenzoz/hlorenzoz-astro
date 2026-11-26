import { describe, it, expect } from 'vitest';
import { LOCALES, localeInfo } from '@/lib/routing';
import { getMessages } from '@/lib/i18n';
import { routeLocales } from '@/lib/routes';
import HomePage from '@/src/pages/[locale]/index.astro';
import ServicesHubPage from '@/src/pages/[locale]/services/index.astro';
import LocalSeoPage from '@/src/pages/[locale]/services/local-seo/index.astro';
import WebsiteDevelopmentPage from '@/src/pages/[locale]/services/website-development/index.astro';
import AiVoiceReceptionistPage from '@/src/pages/[locale]/services/ai-voice-receptionist/index.astro';
import SoftwareDevelopmentPage from '@/src/pages/[locale]/services/software-development/index.astro';
import { ENTRY_PRICE, formatEntryPrice } from '@/lib/pricing';
import { jsonLdNodes, renderPage } from './render-page';

/**
 * The agency publishes no price list: every solution is quoted after a free
 * first call. The single exception is the entry price, which reaches the copy
 * only through the `{entryPrice}` token. Any other figure, or a token that a
 * figure is interpolated into, must not survive anywhere a visitor or a
 * crawler reads it.
 */
const PRICE = /€\s?\d|\d\s?€|EUR\s?\d|\{(price|bundlePrice|monthly|discount|annual|tax)\}/;

function strings(node: unknown, path: string): [string, string][] {
    if (typeof node === 'string') return [[path, node]];
    if (node && typeof node === 'object') {
        return Object.entries(node).flatMap(([key, child]) => strings(child, `${path}.${key}`));
    }
    return [];
}

describe.each(LOCALES)('copy publishes no price (%s)', (locale) => {
    it('has no amount or price token in services.*, home.* or offer.*', () => {
        const messages = getMessages(locale) as Record<string, unknown>;
        const priced = ['services', 'home', 'offer']
            .flatMap((ns) => strings(messages[ns], ns))
            .filter(([, text]) => PRICE.test(text));
        expect(priced).toEqual([]);
    });
});

const SERVICE_PAGES = [
    ['services/local-seo', LocalSeoPage],
    ['services/website-development', WebsiteDevelopmentPage],
    ['services/ai-voice-receptionist', AiVoiceReceptionistPage],
    ['services/software-development', SoftwareDevelopmentPage],
] as const;

describe('the service pages mark up the entry price, and only it', () => {
    it.each(SERVICE_PAGES)('/%s has one Offer, 500 EUR without VAT, shown on the page, in every locale', async (path, Page) => {
        for (const locale of routeLocales(path)) {
            const url = `/${locale}/${path}/`;
            const page = await renderPage(Page, { locale }, url);
            const nodes = jsonLdNodes(page);
            const offers = nodes.filter((node) => node['@type'] === 'Offer') as { price?: unknown; priceSpecification?: unknown }[];
            expect(offers, `${url} Offer`).toHaveLength(1);
            expect(offers[0].price).toBe(String(ENTRY_PRICE.amount));
            expect(offers[0].priceSpecification).toMatchObject({ price: 500, priceCurrency: 'EUR', valueAddedTaxIncluded: false });
            expect(JSON.stringify(nodes), `${url} JSON-LD`).not.toMatch(/"(offers|priceRange|hasOfferCatalog)"/);

            const visible = page.querySelector('main')!.textContent!.replace(/\s/g, ' ');
            expect(visible, `${url} page`).toContain(formatEntryPrice(localeInfo(locale).intl).replace(/\s/g, ' '));
            expect(visible).not.toContain('{entryPrice}');
        }
    });
});

/**
 * The one figure the agency publishes is the entry price. The home marks it up
 * as a single Offer, and only because the same price is visible on the page:
 * Google ignores, and may act against, markup for content readers cannot see.
 */
describe('the home marks up the entry price, and only it', () => {
    it.each(routeLocales(''))('/%s/ has one Offer, 500 EUR without VAT, shown in #fees', async (locale) => {
        const page = await renderPage(HomePage, { locale }, `/${locale}/`);
        const offers = jsonLdNodes(page).filter((node) => node['@type'] === 'Offer');
        expect(offers).toHaveLength(1);
        const [offer] = offers as { price?: unknown; priceCurrency?: unknown; priceSpecification?: unknown }[];
        expect(offer.price).toBe(String(ENTRY_PRICE.amount));
        expect(offer.priceCurrency).toBe('EUR');
        expect(offer.priceSpecification).toMatchObject({ price: 500, priceCurrency: 'EUR', valueAddedTaxIncluded: false });
        expect(JSON.stringify(jsonLdNodes(page))).not.toMatch(/"(priceRange|hasOfferCatalog)"/);

        const fees = page.querySelector('#fees')!.textContent!.replace(/\s/g, ' ');
        expect(fees).toContain(formatEntryPrice(localeInfo(locale).intl).replace(/\s/g, ' '));
    });
});

describe('the services hub states the entry price', () => {
    it.each(routeLocales('services'))('/%s/services/ shows it in the hero, with no token left', async (locale) => {
        const page = await renderPage(ServicesHubPage, { locale }, `/${locale}/services/`);
        const text = page.querySelector('main')!.textContent!.replace(/\s/g, ' ');
        expect(text).toContain(formatEntryPrice(localeInfo(locale).intl).replace(/\s/g, ' '));
        expect(text).not.toContain('{entryPrice}');
    });
});
