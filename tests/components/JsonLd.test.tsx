import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd } from '@/components/JsonLd';
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
    it('renders a supporting-content Article with zoned dates and a typed about', () => {
        const data = defineContentPage(ARTICLE, FIXTURE_REGISTRY).schema('es', (k: string) => k);
        const { container } = render(<JsonLd data={data} />);
        const parsed = JSON.parse(container.querySelector('script')!.textContent!);
        const article = parsed['@graph'].find((n: { '@type': string }) => n['@type'] === 'Article');
        expect(isSchemaDateTime(article.datePublished)).toBe(true);
        expect(isSchemaDateTime(article.dateModified)).toBe(true);
        expect(article.about).toMatchObject({ '@type': 'WebPage', url: 'https://hlorenzoz.com/es/local-seo/gbp/' });
    });

    it('refuses to render a date without a time zone', () => {
        expect(() => render(<JsonLd data={{ '@type': 'Article', datePublished: '2026-11-24' }} />))
            .toThrow(/\$\.datePublished/);
    });

    it('refuses to render a bare-string about', () => {
        expect(() => render(<JsonLd data={{ '@type': 'Article', about: 'https://x/' }} />))
            .toThrow(/\$\.about/);
    });
});
