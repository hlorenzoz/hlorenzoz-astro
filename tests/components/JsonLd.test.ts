import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import JsonLd from '@/src/components/JsonLd.astro';
import { defineContentPage, type ContentPageConfig } from '@/lib/service-page';
import { isSchemaDateTime } from '@/lib/schema/datetime';
import { FIXTURE_REGISTRY } from '@/tests/fixtures/core30-registry';

const ARTICLE: ContentPageConfig = {
    path: 'local-seo/gbp/precios',
    kind: 'article',
    title: 'Cuanto cuesta el SEO local',
    description: 'Rangos de precio reales y que incluye cada tramo.',
    datePublished: '2026-07-01',
    about: { url: 'https://hlorenzoz.com/es/local-seo/gbp/', name: 'GBP' },
};

describe('JsonLd', () => {
    it('renders a supporting-content Article with zoned dates and a typed about', async () => {
        const data = defineContentPage(ARTICLE, FIXTURE_REGISTRY).schema('es', (k: string) => k);
        const { body } = await renderAstro(JsonLd, { data });
        const script = body.querySelector('script[type="application/ld+json"]');
        const parsed = JSON.parse(script!.textContent!);
        const article = parsed['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
        expect(isSchemaDateTime(article.datePublished)).toBe(true);
        expect(isSchemaDateTime(article.dateModified)).toBe(true);
        expect(article.about).toMatchObject({ '@type': 'WebPage', url: 'https://hlorenzoz.com/es/local-seo/gbp/' });
    });

    it('refuses to render a date without a time zone', async () => {
        await expect(renderAstro(JsonLd, { data: { '@type': 'Article', datePublished: '2026-11-24' } })).rejects.toThrow(/\$\.datePublished/);
    });

    it('refuses to render a bare-string about', async () => {
        await expect(renderAstro(JsonLd, { data: { '@type': 'Article', about: 'https://x/' } })).rejects.toThrow(/\$\.about/);
    });
});
