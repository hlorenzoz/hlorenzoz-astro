/**
 * The XML sitemap and the human sitemap read the same registry, and the whole
 * point of that registry is that the two views of the site cannot disagree.
 *
 * They did disagree: the HTML page skipped the `home` tier, so the page whose
 * job is enumerating the site omitted its primary ranking target while
 * /sitemap.xml listed it correctly.
 */
import { describe, it, expect } from 'vitest';
import { sitemap } from '@/src/pages/sitemap.xml';
import { ALL_ROUTES, ROUTE_GROUPS, routeLocales } from '@/lib/routes';
import { SECTION_TIERS, localeHref, type RouteTier } from '@/lib/routing';
import { getPortfolioItems } from '@/lib/portfolio';
import { LOCALES, absoluteUrl } from '@/lib/site-config';

describe('HTML sitemap covers everything the XML sitemap does', () => {
    it('renders a section for every tier the registry actually uses', () => {
        const used = new Set<RouteTier>(ALL_ROUTES.map((r) => r.tier));
        for (const tier of used) {
            expect(SECTION_TIERS, `tier "${tier}" exists in the registry but renders nowhere`)
                .toContain(tier);
        }
    });

    it('includes the home tier, which is the primary ranking target', () => {
        expect(SECTION_TIERS).toContain('home');
    });

    it('leaves no registered route unreachable from the HTML sitemap', () => {
        const covered = ALL_ROUTES.filter((r) => SECTION_TIERS.includes(r.tier));
        expect(covered).toHaveLength(ALL_ROUTES.length);
    });

    /**
     * The strongest form of the guarantee: the set of paths the HTML page
     * renders and the set the XML emits must be identical. Portfolio pages used
     * to reach each list through a separate `if (tier === 'page')` branch, so
     * the two could drift; now both read ROUTE_GROUPS / ALL_ROUTES.
     */
    it('renders exactly the paths the XML sitemap emits, no more and no less', () => {
        const rendered = new Set(ROUTE_GROUPS.flatMap((g) => g.routes.map((r) => r.path)));
        const emitted = new Set(ALL_ROUTES.map((r) => r.path));
        expect([...rendered].sort()).toEqual([...emitted].sort());
    });

    it('includes the data-derived portfolio pages without a tier special case', () => {
        const rendered = ROUTE_GROUPS.flatMap((g) => g.routes.map((r) => r.path));
        for (const item of getPortfolioItems()) {
            expect(rendered, `portfolio/${item.slug} is missing from the HTML sitemap`)
                .toContain(`portfolio/${item.slug}`);
        }
    });
});

describe('HTML sitemap links use the canonical URL form', () => {
    it('appends the trailing slash the site canonicalizes on', () => {
        // astro.config.mjs sets trailingSlash: always, so /en/portfolio is a
        // non-canonical form of a page whose rel=canonical is /en/portfolio/.
        expect(localeHref('en', 'portfolio')).toBe('/en/portfolio/');
        expect(localeHref('es', 'local-seo/gbp')).toBe('/es/local-seo/gbp/');
    });

    it('renders the home route as the bare locale root, not a double slash', () => {
        expect(localeHref('en', '')).toBe('/en/');
    });

    it('matches the path portion of the canonical for every registered route', () => {
        for (const route of ALL_ROUTES) {
            for (const locale of route.locales) {
                const canonical = new URL(absoluteUrl(locale, route.path)).pathname;
                expect(localeHref(locale, route.path)).toBe(canonical);
            }
        }
    });
});

/**
 * Internal links must use the same URL form as the canonicals they point at.
 *
 * The Navbar shipped `/${locale}/portfolio` with no trailing slash while the
 * site runs `trailingSlash: 'always'`, so every page on the site carried a link to
 * a non-canonical form of the portfolio index. This checks the builders rather
 * than the markup so it runs without a build.
 */
describe('internal link builders produce canonical forms', () => {
    it('never produces a path-only href without a trailing slash', () => {
        const hrefs = ALL_ROUTES.flatMap((route) =>
            route.locales.map((locale) => localeHref(locale, route.path))
        );
        for (const href of hrefs) {
            expect(href.endsWith('/'), `"${href}" is not canonical`).toBe(true);
            expect(href).not.toMatch(/\/\//);
        }
    });

    it('normalizes stray slashes on the way in', () => {
        expect(localeHref('en', '/portfolio')).toBe('/en/portfolio/');
        expect(localeHref('en', 'portfolio/')).toBe('/en/portfolio/');
    });
});

describe('XML sitemap', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    it('lists every registered route in every locale it is built in, and no other', () => {
        for (const route of ALL_ROUTES) {
            for (const locale of LOCALES) {
                if (!route.locales.includes(locale)) {
                    expect(urls).not.toContain(absoluteUrl(locale, route.path));
                    continue;
                }
                expect(urls).toContain(absoluteUrl(locale, route.path));
            }
        }
    });

    it('lists every portfolio item in every locale it is built in', () => {
        for (const item of getPortfolioItems()) {
            for (const locale of routeLocales(`portfolio/${item.slug}`)) {
                expect(urls).toContain(absoluteUrl(locale, `portfolio/${item.slug}`));
            }
        }
    });

    /**
     * The sitemap carries `<loc>`, `<lastmod>` and the hreflang alternates, nothing else.
     *
     * It used to also emit `<changefreq>` (hardcoded "weekly" on every entry)
     * and `<priority>` (from a `routePriority` helper that existed only to feed
     * it). Google states outright that it ignores both, and Bing ignores them
     * too: its stated reason is that most sitemaps set them wrong or repeat one
     * value across every URL, which is precisely what this file did. Bing
     * rebuilt its crawl scheduling around `lastmod` instead, so an accurate
     * `lastmod` is the whole value of the file.
     *
     * Asserting the exact key set, rather than just that the two fields are
     * present, is the point: nothing else stops a contributor or a framework
     * default from quietly putting the ignored fields back, since every other
     * test here reads only `url` and `lastModified`.
     */
    it('emits only loc, lastmod and alternates, never the fields crawlers ignore', () => {
        expect(entries.length).toBeGreaterThan(0);
        for (const entry of entries) {
            expect(Object.keys(entry).sort()).toEqual(['alternates', 'lastModified', 'url']);
        }
    });

    /** Sitemap `lastModified` is typed loosely; narrow it to a YYYY-MM-DD string. */
    const isoDay = (value: string | Date | undefined): string =>
        value === undefined ? '' : new Date(value).toISOString().slice(0, 10);

    it('gives portfolio entries their own date rather than one shared constant', () => {
        const bySlug = new Map(getPortfolioItems().map((i) => [i.slug, i.lastModified]));
        const checked: string[] = [];
        for (const entry of entries) {
            const match = entry.url.match(/\/portfolio\/([^/]+)\/$/);
            const expected = match ? bySlug.get(match[1]) : undefined;
            if (expected === undefined) continue;
            expect(isoDay(entry.lastModified)).toBe(expected);
            checked.push(entry.url);
        }
        // Guards the guard: a regex that stops matching would pass vacuously.
        const expected = getPortfolioItems().reduce((n, item) => n + routeLocales(`portfolio/${item.slug}`).length, 0);
        expect(checked.length).toBe(expected);
    });

    /**
     * The previous version of this test compared every entry against today's
     * date and skipped itself whenever any route declared today. Since the
     * freshness rule in AGENTS.md tells authors to stamp the day they edit, the
     * skip fired precisely on the days a regression could land, and with every
     * route stamped 2026-07-20 on 2026-07-20 it asserted nothing at all.
     *
     * Comparing each URL against its own declared source has no such escape:
     * a regression to `new Date()` moves every entry off its registry value.
     */
    it('derives every lastModified from the registry, never from build time', () => {
        const expectedByPath = new Map(ALL_ROUTES.map((r) => [r.path, r.lastModified]));
        let asserted = 0;

        for (const entry of entries) {
            const path = new URL(entry.url).pathname
                .replace(new RegExp(`^/(?:${LOCALES.join('|')})/`), '')
                .replace(/\/$/, '');
            const expected = expectedByPath.get(path);
            expect(expected, `sitemap emitted "${entry.url}" which is in no registry entry`).toBeDefined();
            expect(isoDay(entry.lastModified), `wrong date for ${entry.url}`).toBe(expected);
            asserted++;
        }

        // Proves the loop ran: a path-extraction change that stopped matching
        // would otherwise turn this whole test into a no-op.
        expect(asserted).toBe(ALL_ROUTES.reduce((n, r) => n + r.locales.length, 0));
    });

    it('has no duplicate URLs', () => {
        expect(new Set(urls).size).toBe(urls.length);
    });
});

/**
 * AGENTS.md, "Freshness Dates (MANDATORY)": every time a page's content is
 * created or modified, its modification date must be updated in EVERY place
 * that carries one, in the same change.
 *
 * /{locale}/sitemap/ is the page that trips this rule silently. Its content is
 * not hand-written; it renders every route in the registry, so adding a
 * portfolio entry changes what it displays without anyone touching the file
 * that declares its date. The `masajes-orisha` commit did exactly that and
 * shipped a `sitemap` route still dated 2026-07-20.
 *
 * A stale date here is the specific failure AGENTS.md calls worse than no date:
 * the sitemap advertises pages newer than the sitemap itself claims to be,
 * so the maintenance signal contradicts itself.
 */
describe('the HTML sitemap is never older than what it lists', () => {
    const sitemapRoute = ALL_ROUTES.find((r) => r.path === 'sitemap');

    it('is a registered route', () => {
        expect(sitemapRoute, 'no "sitemap" route in the registry').toBeDefined();
    });

    it('is dated no earlier than the newest route it renders', () => {
        const newest = ALL_ROUTES.reduce(
            (max, route) => (route.lastModified > max ? route.lastModified : max),
            ''
        );
        const stale = ALL_ROUTES.filter((r) => r.lastModified === newest).map((r) => r.path || '(home)');

        expect(
            sitemapRoute!.lastModified,
            `/sitemap/ renders ${stale.join(', ')}, dated ${newest}, but claims ${sitemapRoute!.lastModified}`
        ).toBe(newest);
    });
});
