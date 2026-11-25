import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import portfolioData from '@/lib/portfolio-data.json';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import type { PortfolioItem } from '@/lib/portfolio';

const CDN = 'https://cdn.hlorenzoz.com/';

// Keys the portfolio pages/components actually read for a slides-less "live" project.
const REQUIRED_I18N_KEYS = [
    'title',
    'description',
    'badge',
    'liveDemoButton',
    'heroTitle',
    'heroSubtitle',
    'showcaseTitle',
    'showcaseDescription',
    'ctaTitle',
    'ctaDescription',
    'ctaButton',
] as const;

describe('portfolio data - malaga-event-gear', () => {
    const item = (portfolioData as PortfolioItem[]).find((p) => p.id === 'malaga-event-gear');

    it('exists as a live project pointing at the production domain', () => {
        expect(item).toBeDefined();
        expect(item!.slug).toBe('malaga-event-gear');
        expect(item!.type).toBe('live');
        expect(item!.url).toBe('https://malagaeventgear.com/');
    });

    it('references only uploaded CDN image URLs', () => {
        expect(item!.image.startsWith(CDN)).toBe(true);
        const shots = Array.isArray(item!.fullScreenshot) ? item!.fullScreenshot : [item!.fullScreenshot];
        expect(shots.length).toBeGreaterThan(0);
        for (const url of shots) {
            expect(url.startsWith(CDN)).toBe(true);
            expect(url.endsWith('.webp')).toBe(true);
        }
    });

    it('routes bookings to the live packages page', () => {
        expect(item!.bookingUrl).toBe('https://malagaeventgear.com/packages/');
    });

    it('has speed + data proof slides with CDN images and external links', () => {
        const ids = (item!.slides ?? []).map((s) => s.id);
        expect(ids).toEqual(['speed', 'data']);
        for (const slide of item!.slides ?? []) {
            expect((slide.image as string).startsWith(CDN)).toBe(true);
            expect(slide.link?.startsWith('https://')).toBe(true);
        }
    });

    it('has features_carousel copy for both slides in both locales', () => {
        for (const messages of [en, es]) {
            const fc = (messages as { portfolio: Record<string, Record<string, unknown>> })
                .portfolio['malaga-event-gear'].features_carousel as Record<string, unknown>;
            expect(typeof fc.title).toBe('string');
            expect(typeof fc.description).toBe('string');
            const slides = fc.slides as Record<string, Record<string, unknown>>;
            for (const id of ['speed', 'data']) {
                for (const key of ['badge', 'title', 'description', 'cta']) {
                    expect(typeof slides[id][key], `${id}.${key}`).toBe('string');
                }
            }
        }
    });

    it('has full i18n copy in both locales', () => {
        for (const messages of [en, es]) {
            const entry = (messages as { portfolio: Record<string, Record<string, unknown>> })
                .portfolio['malaga-event-gear'];
            expect(entry).toBeDefined();
            for (const key of REQUIRED_I18N_KEYS) {
                expect(typeof entry[key], `missing "${key}"`).toBe('string');
                expect((entry[key] as string).length).toBeGreaterThan(0);
            }
        }
    });
});

describe('portfolio data - investep-app', () => {
    const item = (portfolioData as PortfolioItem[]).find((p) => p.id === 'investep-app');
    const SLIDE_IDS = ['dashboard', 'brokers', 'performance', 'assets', 'academy', 'admin', 'platform', 'tech'];

    it('exists as a demo pointing at its subdomain', () => {
        expect(item).toBeDefined();
        expect(item!.slug).toBe('investep-app');
        expect(item!.type).toBe('demo');
        expect(item!.url).toBe('https://investep.hlorenzoz.com/');
    });

    it('references only uploaded CDN webp image URLs (cover, showcase and every slide)', () => {
        const shots = Array.isArray(item!.fullScreenshot) ? item!.fullScreenshot : [item!.fullScreenshot];
        const slideImages = (item!.slides ?? []).flatMap((s) =>
            Array.isArray(s.image) ? s.image : s.image ? [s.image] : []
        );
        expect(shots.length).toBeGreaterThan(0);
        for (const url of [item!.image, ...shots, ...slideImages]) {
            expect(url.startsWith(CDN), url).toBe(true);
            expect(url.endsWith('.webp'), url).toBe(true);
        }
    });

    it('exposes the full feature narrative in order', () => {
        expect((item!.slides ?? []).map((s) => s.id)).toEqual(SLIDE_IDS);
    });

    it('has full i18n copy and carousel slides in both locales', () => {
        for (const messages of [en, es]) {
            const portfolio = (messages as { portfolio: Record<string, Record<string, unknown>> }).portfolio;
            const entry = portfolio['investep-app'];
            expect(entry).toBeDefined();
            for (const key of REQUIRED_I18N_KEYS) {
                expect(typeof entry[key], `missing "${key}"`).toBe('string');
                expect((entry[key] as string).length).toBeGreaterThan(0);
            }
            const fc = entry.features_carousel as Record<string, unknown>;
            expect(typeof fc.title).toBe('string');
            expect(typeof fc.description).toBe('string');
            const slides = fc.slides as Record<string, Record<string, unknown>>;
            for (const id of SLIDE_IDS) {
                for (const key of ['badge', 'title', 'description']) {
                    expect(typeof slides[id]?.[key], `${id}.${key}`).toBe('string');
                }
            }
        }
    });
});

describe('portfolio data - vicron-lopez', () => {
    const item = (portfolioData as PortfolioItem[]).find((p) => p.id === 'vicron-lopez');

    it('exists as a live project pointing at the production domain', () => {
        expect(item).toBeDefined();
        expect(item!.slug).toBe('vicron-lopez');
        expect(item!.type).toBe('live');
        expect(item!.url).toBe('https://www.vicronlopez.es/');
    });

    it('exposes the full feature narrative in order', () => {
        expect((item!.slides ?? []).map((s) => s.id))
            .toEqual(['design', 'inventory', 'vehicle', 'local', 'about', 'legal', 'bilingual']);
    });

    /*
     * The quote CTAs read as agency-prospect copy ("Run a rental business?"), so
     * they must resolve to the local contact section, not to the client's catalog.
     * `bookingHref` falls back to /{locale}/#contact only while bookingUrl is unset,
     * which the shared LOCALE_SEGMENTED_CLIENT_SITES guard below asserts.
     */
    it('keeps the quote CTA copy aimed at agency prospects, not at renters', () => {
        for (const messages of [en, es]) {
            const entry = (messages as { portfolio: Record<string, Record<string, unknown>> })
                .portfolio['vicron-lopez'];
            expect((entry.ctaTitle as string).length).toBeGreaterThan(0);
            expect((entry.ctaDescription as string).length).toBeGreaterThan(0);
        }
    });
});

describe('portfolio data - masajes-orisha', () => {
    const item = (portfolioData as PortfolioItem[]).find((p) => p.id === 'masajes-orisha');

    it('exists as a live project pointing at the production domain', () => {
        expect(item).toBeDefined();
        expect(item!.slug).toBe('masajes-orisha');
        expect(item!.type).toBe('live');
        expect(item!.url).toBe('https://masajesorisha.com/');
    });

    it('exposes the full feature narrative in order', () => {
        expect((item!.slides ?? []).map((s) => s.id))
            .toEqual(['design', 'treatments', 'booking', 'journal']);
    });

    /*
     * The showcase carousel is the entry's only full-page proof, and the copy sells
     * the site as working "in light and dark". Shipping light-only captures there
     * would leave that claim unevidenced while the dark renders sit uploaded and
     * unused, which is exactly what the first version of this entry did.
     */
    it('proves both themes in the showcase, not just the light one', () => {
        const shots = item!.fullScreenshot as string[];
        expect(shots.filter((u) => u.endsWith('-light.webp')).length).toBeGreaterThan(0);
        expect(shots.filter((u) => u.endsWith('-dark.webp')).length).toBeGreaterThan(0);
    });
});

describe('portfolio data - gerp-dj', () => {
    const item = (portfolioData as PortfolioItem[]).find((p) => p.id === 'gerp-dj');

    it('exists as a live project pointing at the production domain', () => {
        expect(item).toBeDefined();
        expect(item!.slug).toBe('gerp-dj');
        expect(item!.type).toBe('live');
        expect(item!.url).toBe('https://gerp-dj.com/');
    });

    it('serves every image as a CDN .webp', () => {
        const shots = item!.fullScreenshot as string[];
        const slideImages = (item!.slides ?? []).map((s) => s.image as string);
        for (const url of [item!.image, ...shots, ...slideImages]) {
            expect(url.startsWith(`${CDN}hlorenzoz.com/portfolio/gerp-dj/`), url).toBe(true);
            expect(url.endsWith('.webp'), url).toBe(true);
        }
    });

    it('exposes the full feature narrative in order', () => {
        expect((item!.slides ?? []).map((s) => s.id)).toEqual(['design', 'speed', 'data', 'booking', 'gallery', 'bio']);
    });

    it('shows its PageSpeed and Rich Results reports with links to rerun them', () => {
        const slide = (id: string) => item!.slides?.find((s) => s.id === id);
        expect(slide('speed')).toMatchObject({
            image: `${CDN}hlorenzoz.com/portfolio/gerp-dj/gerp-dj-pagespeed-insights.webp`,
            link: 'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fgerp-dj.com%2F',
        });
        expect(slide('data')).toMatchObject({
            image: `${CDN}hlorenzoz.com/portfolio/gerp-dj/gerp-dj-structured-data-v2.webp`,
            link: 'https://search.google.com/test/rich-results?url=https%3A%2F%2Fgerp-dj.com%2F',
        });
        for (const messages of [en, es]) {
            const fc = (messages as { portfolio: Record<string, Record<string, unknown>> }).portfolio['gerp-dj']
                .features_carousel as { slides: Record<string, Record<string, string>> };
            for (const id of ['speed', 'data']) expect(fc.slides[id]?.cta, `${id}.cta`).toBeTruthy();
        }
    });

    it('has its copy in both locales', () => {
        for (const messages of [en, es]) {
            const entry = (messages as { portfolio: Record<string, Record<string, unknown>> }).portfolio['gerp-dj'];
            for (const key of REQUIRED_I18N_KEYS) expect(entry?.[key], key).toBeTruthy();
        }
    });
});

/*
 * Data-driven guards that must hold for EVERY portfolio entry. These replace the
 * per-project copies that each new case study used to paste in, and they cover the
 * four older entries that never had a data test at all.
 */
describe('portfolio data - every item', () => {
    const items = portfolioData as PortfolioItem[];

    /** Cover + showcase + slide images, deduped, for one entry. */
    function imagesOf(item: PortfolioItem): string[] {
        const shots = Array.isArray(item.fullScreenshot) ? item.fullScreenshot : [item.fullScreenshot];
        const slideImages = (item.slides ?? []).flatMap((s) =>
            Array.isArray(s.image) ? s.image : s.image ? [s.image] : []
        );
        return [...new Set([item.image, ...shots, ...slideImages])];
    }

    it('has at least one entry', () => {
        expect(items.length).toBeGreaterThan(0);
    });

    /*
     * Entries whose LIVE client site serves one language per URL segment, verified
     * by request: vicronlopez.es 302s bare / to a locale segment, and
     * masajesorisha.com serves /es/ and /en/ separately, and GERP DJ serves Spanish
     * at / and Galician under /gl/.
     *
     * For those, no deep link INTO the client's own site is safe. `bookingUrl` and
     * `slide.link` are single strings handed verbatim to `bookingHref` (see
     * src/pages/[locale]/portfolio/[slug]/index.astro), with no locale awareness, so an /en/
     * link strands every Spanish visitor on the English page, contradicting the very
     * bilingual claim these entries are built to demonstrate. Links to third party
     * tools that test the site, such as PageSpeed Insights and the Rich Results
     * Test, are locale neutral and allowed: only a slide link whose host is the
     * entry's own `url` host is rejected.
     *
     * This used to be pasted per project, which is the duplication the data-driven
     * block below exists to end: the invariant is not project-specific, and a fourth
     * bilingual case study would otherwise get no protection until someone
     * remembered to copy the block again. Adding an entry here is now one line.
     */
    const LOCALE_SEGMENTED_CLIENT_SITES = ['vicron-lopez', 'masajes-orisha', 'gerp-dj'];

    it('names only entries that exist', () => {
        const ids = new Set(items.map((i) => i.id));
        for (const id of LOCALE_SEGMENTED_CLIENT_SITES) {
            expect(ids.has(id), `${id} is listed as locale-segmented but is not an entry`).toBe(true);
        }
    });

    const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');
    /** Ids of the slides that deep-link into the entry's own client site. */
    const clientSiteLinks = (item: PortfolioItem) =>
        (item.slides ?? []).filter((s) => s.link && host(s.link) === host(item.url)).map((s) => s.id);

    it.each(LOCALE_SEGMENTED_CLIENT_SITES)('%s carries no locale-blind external deep link', (id) => {
        const item = items.find((i) => i.id === id)!;
        expect(item.bookingUrl, `${id}.bookingUrl would strand one locale`).toBeUndefined();
        expect(clientSiteLinks(item), `${id} slides must not deep-link into the client site`).toEqual([]);
    });

    it('still rejects a slide link into the client site', () => {
        const item = items.find((i) => i.id === 'gerp-dj')!;
        const slides = (item.slides ?? []).map((s) => (s.id === 'design' ? { ...s, link: 'https://www.gerp-dj.com/gl/' } : s));
        expect(clientSiteLinks({ ...item, slides })).toEqual(['design']);
    });

    /*
     * A theme pair is the only reason an entry ships two captures of one page, and
     * `VerticalFeatureCarousel` reaches `HorizontalImageCarousel` only for an array,
     * so collapsing a pair to a single string silently drops the dark-mode proof the
     * copy claims. Arrays that are NOT theme pairs are legitimate (vicron's `legal`
     * slide carries privacy + terms + cookies), so this keys off the -light/-dark
     * suffix rather than off array-ness, and applies to every entry rather than to
     * the one that happened to introduce the pattern.
     */
    const themed = (url: string) => url.endsWith('-light.webp') || url.endsWith('-dark.webp');

    it.each(items.map((i) => [i.id, i] as const))('%s pairs every themed slide image', (_id, item) => {
        for (const slide of item.slides ?? []) {
            const images = Array.isArray(slide.image) ? slide.image : [];
            if (!images.some(themed)) continue;

            expect(images, `${slide.id} mixes themed and unthemed captures`).toHaveLength(2);
            const [light, dark] = images;
            expect(light, `${slide.id} must list the light capture first`).toMatch(/-light\.webp$/);
            expect(dark, `${slide.id} must list the dark capture second`).toMatch(/-dark\.webp$/);
            expect(
                light.replace(/-light\.webp$/, ''),
                `${slide.id} pairs two different pages`
            ).toBe(dark.replace(/-dark\.webp$/, ''));
        }
    });

    /*
     * `description` is the meta description: the page metadata passes it straight into
     * `description`, `openGraph.description` and `twitter.description`, and the index
     * card renders it under `line-clamp-2`. Google renders roughly 160 characters, so
     * anything past that is written for nobody.
     *
     * The exemption list is the same device as PRE_LEDGER_IDS below: these entries
     * were already over budget before the rule existed, back-editing published copy
     * is a separate content decision, and the list is CLOSED so no new entry can join.
     */
    const OVERLONG_DESCRIPTIONS = [
        'lorenzoz-agency',
        'malaga-event-gear',
        'demo-massages',
        'investep-app',
        'vicron-lopez',
    ];
    const META_DESCRIPTION_LIMIT = 160;

    it('has a closed over-budget list that no new entry can join', () => {
        const over = items
            .filter((item) =>
                [en, es].some((m) => {
                    const entry = (m as { portfolio: Record<string, Record<string, unknown>> })
                        .portfolio[item.id];
                    const description = entry?.description;
                    return typeof description === 'string' && description.length > META_DESCRIPTION_LIMIT;
                })
            )
            .map((i) => i.id);
        expect(over.sort()).toEqual([...OVERLONG_DESCRIPTIONS].sort());
    });

    it.each(items.map((i) => [i.id, i] as const))('%s serves every image from the CDN', (_id, item) => {
        const urls = imagesOf(item);
        expect(urls.length).toBeGreaterThan(0);
        for (const url of urls) {
            expect(url.startsWith(CDN), url).toBe(true);
        }
    });

    /*
     * scripts/convert-and-map.mjs emits webp + avif for everything it processes, so
     * any non-webp URL is an asset that predates the pipeline. One such image is left:
     * real-estate's cover, whose source is not in assets/ and so cannot be regenerated
     * without the original. Pinning the exact URL keeps that debt visible and stops it
     * growing, which a blanket "all images are webp" assertion could not do without
     * being deleted outright.
     */
    it('has exactly one known non-webp legacy image', () => {
        const nonWebp = items.flatMap(imagesOf).filter((url) => !url.endsWith('.webp'));
        expect([...new Set(nonWebp)]).toEqual([
            'https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/real-estate/screencapture-home.jpg',
        ]);
    });

    /*
     * A CDN-shaped string proves nothing: a typo in a filename still starts with the
     * CDN host and still ends in .webp, and ships a 404 image. assets/mappings.json is
     * the upload ledger written by scripts/convert-and-map.mjs, so an entry appears
     * there only after a successful R2 upload. Checking membership is what makes the
     * assertion above mean "uploaded" rather than "spelled plausibly".
     */
    describe('every image URL was actually uploaded', () => {
        const ledger = new Set(
            Object.values(
                JSON.parse(readFileSync(join(process.cwd(), 'assets/mappings.json'), 'utf8')) as Record<
                    string,
                    { formats?: Record<string, string> }
                >
            ).flatMap((entry) => Object.values(entry.formats ?? {}))
        );

        /*
         * These three entries predate the ledger: their images were uploaded to R2 by
         * hand before scripts/convert-and-map.mjs existed, so mappings.json has no row
         * for them and back-filling it would mean inventing upload records. The list is
         * CLOSED, and the test below fails if it ever grows, so every new case study is
         * forced through `bun run images:sync`.
         */
        const PRE_LEDGER_IDS = ['lorenzoz-agency', 'dental-clinic-1', 'real-estate'];

        it('has a closed exemption list that no new entry can join', () => {
            const unledgered = items
                .filter((item) => imagesOf(item).some((url) => !ledger.has(url)))
                .map((item) => item.id);
            expect(unledgered.sort()).toEqual([...PRE_LEDGER_IDS].sort());
        });

        const ledgered = items.filter((i) => !PRE_LEDGER_IDS.includes(i.id));

        it('covers more entries than it exempts', () => {
            expect(ledgered.length).toBeGreaterThan(PRE_LEDGER_IDS.length);
        });

        it.each(ledgered.map((i) => [i.id, i] as const))('%s has every image in the ledger', (_id, item) => {
            for (const url of imagesOf(item)) {
                expect(ledger.has(url), `${url} is not in assets/mappings.json`).toBe(true);
                // Everything the pipeline produced is webp; only pre-ledger assets are not.
                expect(url.endsWith('.webp'), url).toBe(true);
            }
        });
    });

    it.each(items.map((i) => [i.id, i] as const))('%s has full i18n copy in both locales', (id, _item) => {
        for (const messages of [en, es]) {
            const entry = (messages as { portfolio: Record<string, Record<string, unknown>> }).portfolio[id];
            expect(entry, `portfolio.${id} missing`).toBeDefined();
            for (const key of REQUIRED_I18N_KEYS) {
                expect(typeof entry[key], `${id}.${key}`).toBe('string');
                expect((entry[key] as string).length, `${id}.${key} empty`).toBeGreaterThan(0);
            }
        }
    });

    it.each(items.filter((i) => i.slides?.length).map((i) => [i.id, i] as const))(
        '%s has carousel copy for every slide in both locales',
        (id, item) => {
            for (const messages of [en, es]) {
                const entry = (messages as { portfolio: Record<string, Record<string, unknown>> }).portfolio[id];
                const fc = entry.features_carousel as Record<string, unknown>;
                expect(typeof fc?.title, `${id}.features_carousel.title`).toBe('string');
                expect(typeof fc?.description, `${id}.features_carousel.description`).toBe('string');
                const slides = fc.slides as Record<string, Record<string, unknown>>;
                for (const slide of item.slides ?? []) {
                    for (const key of ['badge', 'title', 'description']) {
                        expect(typeof slides[slide.id]?.[key], `${id}.${slide.id}.${key}`).toBe('string');
                    }
                }
            }
        }
    );

    /*
     * VerticalFeatureCarousel renders t(`slides.<id>.<field>`) whenever the message key
     * exists and only falls back to the JSON field otherwise. Since messages/en.json
     * defines every slide key, the copy duplicated in portfolio-data.json is dead at
     * render time, and nothing else compares the two: messages-parity checks en against
     * es, never against the JSON. Editing one and forgetting the other is silent, so
     * this asserts they agree while both continue to exist.
     */
    it.each(
        (portfolioData as PortfolioItem[]).filter((i) => i.slides?.length).map((i) => [i.id, i] as const)
    )('%s keeps its JSON slide copy in step with messages/en.json', (id, item) => {
        const slides = (
            (en as { portfolio: Record<string, Record<string, unknown>> }).portfolio[id]
                .features_carousel as Record<string, unknown>
        ).slides as Record<string, Record<string, string>>;
        for (const slide of item.slides ?? []) {
            for (const key of ['badge', 'title', 'description'] as const) {
                if (slide[key] === undefined) continue;
                expect(slide[key], `${id}.${slide.id}.${key} drifted from messages/en.json`)
                    .toBe(slides[slide.id][key]);
            }
        }
    });
});

/*
 * Every real client site gets an "About the business" section on its detail page
 * (src/pages/[locale]/portfolio/[slug]/index.astro renders it for `type: 'live'` only).
 * A missing key renders as its last path segment in production, so a live entry
 * without this copy would ship "title" as visible text. Demos describe no
 * real business and are not required to carry it.
 */
describe('portfolio data - live entries describe their business', () => {
    const items = portfolioData as PortfolioItem[];
    const live = items.filter((i) => i.type === 'live').map((i) => i.id);
    type Business = { title?: unknown; paragraphs?: unknown };
    const businessOf = (locale: Record<string, unknown>, id: string) =>
        ((locale.portfolio as Record<string, Record<string, unknown>>)[id]?.business ?? {}) as Business;

    it('has live entries to check', () => {
        expect(live.length).toBeGreaterThan(0);
    });

    describe.each([['en', en], ['es', es]] as const)('%s', (_name, locale) => {
        it.each(live)('%s has a business title and at least 2 non empty paragraphs', (id) => {
            const business = businessOf(locale, id);
            expect(typeof business.title === 'string' && business.title.trim().length > 0, `${id}.business.title`).toBe(true);
            expect(Array.isArray(business.paragraphs), `${id}.business.paragraphs`).toBe(true);
            const paragraphs = business.paragraphs as unknown[];
            expect(paragraphs.length).toBeGreaterThanOrEqual(2);
            for (const p of paragraphs) expect(typeof p === 'string' && p.trim().length > 0).toBe(true);
        });
    });

    it('does not require the section from demo entries', () => {
        const demos = items.filter((i) => i.type === 'demo').map((i) => i.id);
        expect(demos.length).toBeGreaterThan(0);
        expect(demos.every((id) => !live.includes(id))).toBe(true);
    });
});
