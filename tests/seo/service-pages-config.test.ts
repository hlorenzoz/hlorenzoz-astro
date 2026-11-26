/**
 * Contract tests for the REAL Core 30 service pages (hub + 4 services), not a
 * fixture. `tests/seo/service-page.test.ts` proves the factory itself is
 * correct in isolation; this proves the pages this repo actually ships wire
 * it up without throwing, register the right kind/tier, and produce the
 * schema/breadcrumb shape the spec requires.
 *
 * The pages read their per-locale `LocaleContentPages` from
 * `src/pages/[locale]/services/_service-content.ts` (`hubContentPages` for the
 * hub, `serviceContentPagesByKey.<key>` for each service), built at module
 * scope and so validated once at import time for each locale. The `_` prefix
 * keeps Astro from routing the module. Two locale instances, not one, because
 * `defineContentPage`'s `title`/`description` are plain strings: a single
 * instance cannot carry both the English and Spanish copy the messages files
 * author for every service, and this repo is bilingual by requirement.
 */
import { describe, it, expect } from 'vitest';
import { defineContentPage, MAX_AUTHORED_TITLE } from '@/lib/service-page';
import { absoluteUrl } from '@/lib/site-config';

import { hubContentPages, serviceContentPagesByKey, type LocaleContentPages } from '@/src/pages/[locale]/services/_service-content';
import { serviceKeyFromSlug } from '@/lib/pricing';

const hub = { contentPages: hubContentPages };
const pagesFor = (slug: string) => ({ contentPages: serviceContentPagesByKey[serviceKeyFromSlug(slug)] });
const localSeo = pagesFor('local-seo');
const websiteDevelopment = pagesFor('website-development');
const aiVoiceReceptionist = pagesFor('ai-voice-receptionist');
const softwareDevelopment = pagesFor('software-development');

/**
 * The live services, in registry order. None is a core offer: they are the
 * building blocks of one tailored solution. The paused Digital Business Card has no entry: its page sits
 * in a private folder and its route is commented out.
 */
const SERVICE_SLUGS = ['local-seo', 'website-development', 'ai-voice-receptionist', 'software-development'] as const;

type Graph = { '@graph': Array<Record<string, unknown>> };
const node = (g: unknown, type: string) =>
    (g as Graph)['@graph'].find((n) => n['@type'] === type);

/** Echoes the key, like the factory's own test suite, so assertions read the
 * labelKey itself rather than depending on copy. */
const T = (key: string) => key;

describe('service pages: hub', () => {
    it('exports a validated ContentPage for both locales', () => {
        expect(hub.contentPages.en!.config.kind).toBe('category');
        expect(hub.contentPages.es!.config.kind).toBe('category');
        expect(hub.contentPages.en!.config.path).toBe('services');
    });

    it('links exactly the four services as children, in registry order', () => {
        const links = hub.contentPages.en!.children('en', T);
        // Order matters: it is the order the hub lists them in.
        expect(links.map((l) => l.url)).toEqual(
            SERVICE_SLUGS.map((slug) => absoluteUrl('en', `services/${slug}`))
        );
    });

    it('no longer links the absorbed or the paused service', () => {
        const urls = hub.contentPages.en!.children('en', T).map((l) => l.url).join(' ');
        expect(urls).not.toContain('reputation-review-management');
        expect(urls).not.toContain('digital-business-card');
    });

    it('gives a two-level breadcrumb trail rooted at home', () => {
        const g = hub.contentPages.en!.schema('en', T) as Graph;
        const crumbs = node(g, 'BreadcrumbList')?.itemListElement as { item: string }[];
        expect(crumbs.map((c) => c.item)).toEqual([
            absoluteUrl('en', ''),
            absoluteUrl('en', 'services'),
        ]);
    });

    it('emits a CollectionPage with an ItemList naming exactly the four services', () => {
        const g = hub.contentPages.en!.schema('en', T) as Graph;
        const collection = node(g, 'CollectionPage');
        expect(collection).toBeDefined();
        const list = collection?.mainEntity as { numberOfItems: number; itemListElement: { url: string }[] };
        expect(list.numberOfItems).toBe(4);
        expect(list.itemListElement.map((i) => i.url)).toEqual(
            SERVICE_SLUGS.map((slug) => absoluteUrl('en', `services/${slug}`))
        );
    });

    it('emits a locale-specific title tag, not the same string for both locales', () => {
        const enTitle = hub.contentPages.en!.metadata('en').title;
        const esTitle = hub.contentPages.es!.metadata('es').title;
        expect(enTitle).not.toBe(esTitle);
    });
});

const SERVICES = [
    { slug: 'local-seo', mod: localSeo },
    { slug: 'website-development', mod: websiteDevelopment },
    { slug: 'ai-voice-receptionist', mod: aiVoiceReceptionist },
    { slug: 'software-development', mod: softwareDevelopment },
] as const satisfies readonly { slug: string; mod: { contentPages: LocaleContentPages } }[];

describe.each(SERVICES)('service page: services/$slug', ({ slug, mod }) => {
    it('exports a validated service-kind ContentPage for both locales', () => {
        expect(mod.contentPages.en!.config.kind).toBe('service');
        expect(mod.contentPages.es!.config.kind).toBe('service');
        expect(mod.contentPages.en!.config.path).toBe(`services/${slug}`);
    });

    it('gives a three-level breadcrumb trail: home -> services -> the service', () => {
        const g = mod.contentPages.en!.schema('en', T) as Graph;
        const crumbs = node(g, 'BreadcrumbList')?.itemListElement as { item: string }[];
        expect(crumbs.map((c) => c.item)).toEqual([
            absoluteUrl('en', ''),
            absoluteUrl('en', 'services'),
            absoluteUrl('en', `services/${slug}`),
        ]);
    });

    it('emits Service + BreadcrumbList + FAQPage', () => {
        const g = mod.contentPages.en!.schema('en', T) as Graph;
        expect(node(g, 'Service')).toBeDefined();
        expect(node(g, 'BreadcrumbList')).toBeDefined();
        expect(node(g, 'FAQPage')).toBeDefined();
    });

    it('emits no offers on the Service node', () => {
        // Every solution is quoted after a free first call: no figure to publish.
        const g = mod.contentPages.en!.schema('en', T) as Graph;
        expect(node(g, 'Service')?.offers, `services/${slug} emits an offer`).toBeUndefined();
    });

    it('keeps the schema WebPage url identical to the metadata canonical, per locale', () => {
        for (const locale of ['en', 'es'] as const) {
            const canonical = mod.contentPages[locale]!.metadata(locale).alternates?.canonical;
            const g = mod.contentPages[locale]!.schema(locale, T) as Graph;
            const page = node(g, 'WebPage');
            expect(page?.url).toBe(canonical);
        }
    });

    it('emits a locale-specific title tag, not the same string for both locales', () => {
        const enTitle = mod.contentPages.en!.metadata('en').title;
        const esTitle = mod.contentPages.es!.metadata('es').title;
        expect(enTitle).not.toBe(esTitle);
    });
});

/**
 * Defensive scenario from the spec ("Title over budget throws"), isolated
 * from every real route: this constructs a throwaway config on an already
 * registered path purely to prove the guard fires, and is NOT wired into any
 * shipped page.
 */
describe('title over budget (defensive, not a real route)', () => {
    it('throws at construction time for a title exceeding the 42-char budget', () => {
        const oversized = 'a'.repeat(MAX_AUTHORED_TITLE + 1);
        expect(() =>
            defineContentPage({
                path: 'services/local-seo',
                kind: 'service',
                title: oversized,
                description: 'Defensive oversized-title scenario, never rendered.',
            })
        ).toThrow(/the budget is 42/);
    });
});
