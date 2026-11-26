import { describe, it, expect } from 'vitest';
import { LOCALES } from '@/lib/routing';
import { getMessages } from '@/lib/i18n';
import { routeLocales } from '@/lib/routes';
import HomePage from '@/src/pages/[locale]/index.astro';
import LocalSeoPage from '@/src/pages/[locale]/services/local-seo/index.astro';
import WebsiteDevelopmentPage from '@/src/pages/[locale]/services/website-development/index.astro';
import AiVoiceReceptionistPage from '@/src/pages/[locale]/services/ai-voice-receptionist/index.astro';
import SoftwareDevelopmentPage from '@/src/pages/[locale]/services/software-development/index.astro';
import { jsonLdNodes, renderPage } from './render-page';

/**
 * The agency publishes no price: every solution is quoted after a free first
 * call. A figure, or a token that a figure is interpolated into, must not
 * survive anywhere a visitor or a crawler reads it.
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

const PAGES = [
    ['', HomePage],
    ['services/local-seo', LocalSeoPage],
    ['services/website-development', WebsiteDevelopmentPage],
    ['services/ai-voice-receptionist', AiVoiceReceptionistPage],
    ['services/software-development', SoftwareDevelopmentPage],
] as const;

describe('structured data publishes no price', () => {
    it.each(PAGES)('/%s emits no offers or priceRange in any locale', async (path, Page) => {
        for (const locale of routeLocales(path)) {
            const url = `/${locale}/${path ? `${path}/` : ''}`;
            const nodes = jsonLdNodes(await renderPage(Page, { locale }, url));
            expect(nodes.length).toBeGreaterThan(0);
            const priced = JSON.stringify(nodes).match(/"(offers|priceRange|hasOfferCatalog|priceSpecification)"/g);
            expect(priced, `${url} JSON-LD`).toBeNull();
        }
    });
});
