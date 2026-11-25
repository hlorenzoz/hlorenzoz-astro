/**
 * Key-tree parity between the locale message files.
 *
 * A production build does not fail on a missing key: the translator renders
 * the key's last segment instead, so a page translated in `en` but not `es`
 * ships visible text like "services.localSeo.title" to users and to Google.
 * Nothing else in the pipeline catches that: lint passes, types pass, the
 * static export succeeds, and the broken copy only shows up if a human loads
 * the Spanish route.
 *
 * This matters most for batched content work, where copy lands in both files
 * a page at a time and one skipped translation is easy to miss.
 */
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import { ALL_ROUTES } from '@/lib/routes';
import { SECTION_TIERS } from '@/lib/routing';

type Json = Record<string, unknown>;

/** Flattens a message tree into sorted dot-paths, descending arrays by index. */
function keyPaths(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) {
        return value.flatMap((item, i) => keyPaths(item, `${prefix}.${i}`));
    }
    if (value !== null && typeof value === 'object') {
        return Object.entries(value as Json).flatMap(([key, child]) =>
            keyPaths(child, prefix ? `${prefix}.${key}` : key)
        );
    }
    return [prefix];
}

const enKeys = keyPaths(en);
const esKeys = keyPaths(es);

describe('messages/en.json <-> messages/es.json parity', () => {
    it('has no key present in en but missing from es', () => {
        const missing = enKeys.filter((k) => !esKeys.includes(k));
        expect(missing, `Missing Spanish translations:\n${missing.join('\n')}`).toEqual([]);
    });

    it('has no key present in es but missing from en', () => {
        const extra = esKeys.filter((k) => !enKeys.includes(k));
        expect(extra, `Spanish keys with no English counterpart:\n${extra.join('\n')}`).toEqual([]);
    });

    /**
     * Parity alone is blind to a key that is missing from BOTH files. That is
     * not theoretical: adding the `home` tier to SECTION_TIERS without adding
     * `sitemap.tiers.home` produced a symmetric gap the parity checks passed
     * over, and the static build only logged `MISSING_MESSAGE` while exiting 0,
     * so the page would have shipped with the key path rendered as a heading.
     *
     * These assertions tie the message files to the code that consumes them.
     */
    describe('keys the code requires actually exist', () => {
        const has = (path: string) =>
            path.split('.').reduce<unknown>((acc, seg) => (acc as Json)?.[seg], en) !== undefined;
        const hasEs = (path: string) =>
            path.split('.').reduce<unknown>((acc, seg) => (acc as Json)?.[seg], es) !== undefined;

        it.each(SECTION_TIERS)('has a label for the "%s" sitemap tier', (tier) => {
            expect(has(`sitemap.tiers.${tier}`), `messages/en.json lacks sitemap.tiers.${tier}`).toBe(true);
            expect(hasEs(`sitemap.tiers.${tier}`), `messages/es.json lacks sitemap.tiers.${tier}`).toBe(true);
        });

        it('resolves every labelKey declared in the route registry', () => {
            for (const route of ALL_ROUTES) {
                if (!route.labelKey) continue;
                expect(has(route.labelKey), `en.json lacks ${route.labelKey} (route "${route.path}")`).toBe(true);
                expect(hasEs(route.labelKey), `es.json lacks ${route.labelKey} (route "${route.path}")`).toBe(true);
            }
        });

        it('has the byline labels the ArticleByline needs', () => {
            for (const key of ['sitemap.byline.by', 'sitemap.byline.updated', 'sitemap.byline.readTime']) {
                expect(has(key), `en.json lacks ${key}`).toBe(true);
                expect(hasEs(key), `es.json lacks ${key}`).toBe(true);
            }
        });
    });

    it('has no untranslated placeholder markers left behind', () => {
        // Case-sensitive on purpose. A case-insensitive match flags ordinary
        // Spanish copy such as "Todo lo que necesitas para", which is a real
        // translation, not a placeholder.
        const offenders = esKeys.filter((path) => {
            const value = path
                .split('.')
                .reduce<unknown>((acc, seg) => (acc as Json)?.[seg], es);
            return typeof value === 'string' && /^(TODO|FIXME|TRANSLATE)\b/.test(value);
        });
        expect(offenders).toEqual([]);
    });
});

/**
 * Key-tree parity is order-blind: it compares sets, so two catalogues can hold
 * exactly the same keys and still declare them in different sequences.
 *
 * That is not cosmetic. Translation review is done by reading the two files
 * side by side, and it only works while the same key sits on roughly the same
 * line in both. `vicron-lopez` and `masajes-orisha` both drifted to
 * title/badge/description in Spanish against title/description/badge in
 * English, and nothing flagged it, because every existing check here passes on
 * a reordered object.
 *
 * The rule only bites where both sides already agree on the key SET, so a
 * genuine missing translation still fails as a missing key above rather than
 * surfacing here as an ordering problem.
 */
describe('messages/en.json <-> messages/es.json declaration order', () => {
    const isPlain = (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v);

    /** Paths of objects whose key sets match but whose key ORDER does not. */
    function reordered(a: unknown, b: unknown, path = ''): string[] {
        if (!isPlain(a) || !isPlain(b)) return [];

        const ka = Object.keys(a as Json);
        const kb = Object.keys(b as Json);
        const here = ka.length === kb.length && ka.join(' ') !== kb.join(' ') ? [path || '(root)'] : [];

        return ka
            .filter((key) => key in (b as Json))
            .reduce<string[]>(
                (acc, key) =>
                    acc.concat(
                        reordered((a as Json)[key], (b as Json)[key], path ? `${path}.${key}` : key)
                    ),
                here
            );
    }

    it('declares shared keys in the same order in both catalogues', () => {
        const drifted = reordered(en, es);
        expect(
            drifted,
            `These objects hold the same keys in a different order:\n${drifted.join('\n')}`
        ).toEqual([]);
    });
});

/**
 * The seven locales added for the page by page rollout are partial on purpose:
 * a page is published in a locale once its keys land (`lib/routes.ts`
 * `copyKeys`). Partial must still mean a subset of English: a key English does
 * not have is a typo nothing would ever read, and a value of another type
 * (a string where English has a list) breaks `t.raw()` consumers at build.
 */
describe('rollout locale files hold only English keys, with English value types', () => {
    const ROLLOUT = ['en-gb', 'gl', 'pt', 'it', 'fr', 'de', 'nl'] as const;
    const files = import.meta.glob<Json>('/messages/*.json', { eager: true, import: 'default' });
    const typeOf = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

    /** Paths in `b` that `a` lacks or types differently, walking objects and arrays alike. */
    function strays(a: unknown, b: unknown, path = ''): string[] {
        if (typeOf(a) !== typeOf(b)) return [`${path} (${typeOf(b)}, en has ${typeOf(a)})`];
        if (b === null || typeof b !== 'object') return [];
        return Object.entries(b as Json).flatMap(([key, child]) => {
            const at = path ? `${path}.${key}` : key;
            return key in (a as Json) ? strays((a as Json)[key], child, at) : [`${at} (not in en)`];
        });
    }

    it.each(ROLLOUT)('messages/%s.json', (locale) => {
        const messages = files[`/messages/${locale}.json`];
        expect(messages, `messages/${locale}.json is missing`).toBeDefined();
        expect(strays(en, messages)).toEqual([]);
    });
});
