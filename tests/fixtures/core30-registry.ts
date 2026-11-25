/**
 * A Core 30 route registry for tests.
 *
 * The live registry holds only `home`, `page` and `legal` tiers until the first
 * content page ships, so asserting Core 30 invariants against it would mean
 * using portfolio routes as stand-ins for categories and services. That is how
 * an earlier fixture ended up declaring a "category" on a `page`-tier route.
 *
 * Lives outside any `.test.ts` file on purpose: importing a test module to
 * borrow its fixture re-runs that module's suites in the importer.
 * `tests/lib/route-registry-contract.test.ts` holds this and the live
 * registry to one contract.
 */
import type { SiteRoute, ValidatedRoute } from '@/lib/routing';
import type { RouteRegistry } from '@/lib/service-page';

export const FIXTURE: SiteRoute[] = [
    { path: '', tier: 'home', labelKey: 'navigation.home', lastModified: '2026-07-01' },
    { path: 'local-seo', tier: 'category', labelKey: 'services.localSeo.title', lastModified: '2026-07-05', parent: '' },
    { path: 'local-seo/gbp', tier: 'service', labelKey: 'services.localSeo.gbp.title', lastModified: '2026-07-10', parent: 'local-seo' },
    { path: 'local-seo/citations', tier: 'service', labelKey: 'services.localSeo.citations.title', lastModified: '2026-07-11', parent: 'local-seo' },
    { path: 'local-seo/gbp/precios', tier: 'supporting', labelKey: 'services.localSeo.precios.title', lastModified: '2026-07-12', parent: 'local-seo/gbp' },
    { path: 'local-seo/gbp/plazos', tier: 'supporting', labelKey: 'services.localSeo.plazos.title', lastModified: '2026-07-13', parent: 'local-seo/gbp' },
    // A mis-tiered child: registered under the category but not a service.
    // Core 30 says a category groups its SERVICES, so this must be excluded.
    { path: 'local-seo/descargable', tier: 'page', labelKey: 'services.localSeo.descargable.title', lastModified: '2026-07-09', parent: 'local-seo' },
    { path: 'zonas/ourense', tier: 'location', labelKey: 'zonas.ourense.title', lastModified: '2026-07-14', parent: '' },
    // A category whose only child is mis-tiered. The childless guard must still
    // reject it: children exist, but none of them are services. This is the case
    // that distinguishes "filter then count" from "count then hope".
    { path: 'mistiered-category', tier: 'category', labelKey: 'services.mistiered.title', lastModified: '2026-07-10', parent: '' },
    { path: 'mistiered-category/leaflet', tier: 'page', labelKey: 'services.mistiered.leaflet.title', lastModified: '2026-07-10', parent: 'mistiered-category' },
    { path: 'empty-category', tier: 'category', labelKey: 'services.empty.title', lastModified: '2026-07-10', parent: '' },
    { path: 'privacy-policy', tier: 'legal', labelKey: 'footer.legal.items.0.label', lastModified: '2026-07-10', parent: '' },
    { path: 'portfolio', tier: 'page', labelKey: 'navigation.portfolio', lastModified: '2026-07-10', parent: '' },
];

const validated = (r: SiteRoute): ValidatedRoute =>
    ({ ...r, lastModifiedDate: new Date(`${r.lastModified}T00:00:00Z`) });

export const FIXTURE_REGISTRY: RouteRegistry = {
    findRoute: (path) => {
        const r = FIXTURE.find((x) => x.path === path);
        return r ? validated(r) : undefined;
    },
    childRoutes: (parent) => FIXTURE.filter((x) => x.parent === parent).map(validated),
    breadcrumbTrail: (path) => {
        const trail: SiteRoute[] = [];
        let current = FIXTURE.find((x) => x.path === path);
        while (current) {
            trail.unshift(current);
            if (current.parent === undefined) break;
            const parentPath: string = current.parent;
            current = FIXTURE.find((x) => x.path === parentPath);
        }
        return trail.map(validated);
    },
};
