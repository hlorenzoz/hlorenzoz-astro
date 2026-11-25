/**
 * The nine-locale scheme and the per-page availability rule.
 *
 * Pages roll out one locale at a time: a page exists in a locale only when its
 * copy (and the shared shell copy) exists in that locale's messages file. These
 * tests pin the table every per-locale fact comes from and the one rule that
 * decides "page P exists in locale L", which the build, hreflang, the sitemaps
 * and the language switcher all read.
 */
import { describe, it, expect } from 'vitest';
import { LOCALES, LOCALE_INFO, languageAlternates, ogLocale, absoluteUrl } from '@/lib/site-config';
import { SHELL_KEYS, localesWithKeys, pageLocales } from '@/lib/i18n';
import { ALL_ROUTES, routeAlternates, routeExists, routeHref, routeLocales } from '@/lib/routes';
import { formatAmount } from '@/lib/pricing';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

describe('locale table', () => {
    it('lists the nine URL codes, international English first', () => {
        expect(LOCALES).toEqual(['en', 'es', 'en-gb', 'gl', 'pt', 'it', 'fr', 'de', 'nl']);
    });

    it('has a complete entry for every locale', () => {
        expect(Object.keys(LOCALE_INFO).sort()).toEqual([...LOCALES].sort());
        for (const locale of LOCALES) {
            const info = LOCALE_INFO[locale];
            expect(info.tag, locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
            expect(info.ogLocale, locale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
            expect(() => new Intl.NumberFormat(info.intl), locale).not.toThrow();
            expect(info.name.length, locale).toBeGreaterThan(0);
        }
    });

    it('uses the BCP 47 tags and OpenGraph locales the scheme defines', () => {
        expect(LOCALES.map((l) => LOCALE_INFO[l].tag)).toEqual(['en', 'es', 'en-GB', 'gl', 'pt-PT', 'it', 'fr', 'de', 'nl']);
        expect(LOCALES.map(ogLocale)).toEqual(['en_US', 'es_ES', 'en_GB', 'gl_ES', 'pt_PT', 'it_IT', 'fr_FR', 'de_DE', 'nl_NL']);
    });

    it('names each language natively for the switcher', () => {
        expect(LOCALES.map((l) => LOCALE_INFO[l].name)).toEqual([
            'English', 'Español', 'English (UK)', 'Galego', 'Português', 'Italiano', 'Français', 'Deutsch', 'Nederlands',
        ]);
    });

    it('keeps the en and es price formats unchanged', () => {
        expect(formatAmount(2500, 'en')).toBe('€2,500');
        expect(formatAmount(2500, 'es')).toBe('2.500 €');
    });
});

describe('localesWithKeys (page availability rule)', () => {
    const shell = Object.fromEntries(SHELL_KEYS.map((k) => [k, k]));
    // Builds a nested message object from dot paths.
    const tree = (paths: Record<string, string>) => {
        const out: Record<string, unknown> = {};
        for (const [path, value] of Object.entries(paths)) {
            const parts = path.split('.');
            let node = out;
            for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as Record<string, unknown>;
            node[parts.at(-1)!] = value;
        }
        return out;
    };
    // Shell keys are subtrees in the real files; here each one is a single leaf.
    const fullShell = (): Record<string, string> => ({ ...shell });

    it('includes a locale that has the page key and the shell keys', () => {
        const messages = {
            en: tree({ ...fullShell(), 'card.title': 'T' }),
            gl: tree({ ...fullShell(), 'card.title': 'T' }),
        };
        expect(localesWithKeys(messages, ['card.title'])).toEqual(['en', 'gl']);
    });

    it('excludes a locale missing the page key', () => {
        const messages = { en: tree({ ...fullShell(), 'card.title': 'T' }), gl: tree(fullShell()) };
        expect(localesWithKeys(messages, ['card.title'])).toEqual(['en']);
    });

    it('excludes a locale missing a shell key even when the page key exists', () => {
        const partialShell = { ...fullShell() };
        delete partialShell[SHELL_KEYS[0]];
        const messages = {
            en: tree({ ...fullShell(), 'card.title': 'T' }),
            gl: tree({ ...partialShell, 'card.title': 'T' }),
        };
        expect(localesWithKeys(messages, ['card.title'])).toEqual(['en']);
    });

    it('treats a key naming a subtree as every leaf English has under it', () => {
        const messages = {
            en: tree({ ...fullShell(), 'card.a': 'A', 'card.b': 'B' }),
            gl: tree({ ...fullShell(), 'card.a': 'A' }),
            fr: tree({ ...fullShell(), 'card.a': 'A', 'card.b': 'B' }),
        };
        expect(localesWithKeys(messages, ['card'])).toEqual(['en', 'fr']);
    });

    it('throws on a key English does not have, since that is a registry typo', () => {
        expect(() => localesWithKeys({ en: tree(fullShell()) }, ['nope.missing'])).toThrow(/nope\.missing/);
    });
});

describe('live availability', () => {
    it('builds every page in en and es (the fully written locales)', () => {
        for (const route of ALL_ROUTES) {
            expect(routeLocales(route.path).slice(0, 2), route.path || '(home)').toEqual(['en', 'es']);
        }
    });

    it('builds a page in a new locale only when that locale holds all of its copy', () => {
        // The rollout is page by page: which pages exist depends on what is translated, not on a list.
        for (const route of ALL_ROUTES) {
            for (const locale of routeLocales(route.path)) {
                expect(pageLocales(...(route.copyKeys ?? [])), `${route.path || '(home)'} in ${locale}`).toContain(locale);
            }
        }
    });

    it('never builds a page in a locale its parent (its breadcrumb target) is not built in', () => {
        for (const route of ALL_ROUTES) {
            if (route.parent === undefined) continue;
            const parent = routeLocales(route.parent);
            for (const locale of route.locales) expect(parent, `${route.path} in ${locale}`).toContain(locale);
        }
    });

    it('refuses an unregistered path instead of guessing its locales', () => {
        expect(() => routeLocales('no/such/page')).toThrow(/no\/such\/page/);
    });
});

describe('image and accessible text gate publication like page copy', () => {
    const without = (path: string) => {
        const copy = structuredClone(es) as Record<string, unknown>;
        const parts = path.split('.');
        const leaf = parts.pop()!;
        delete (parts.reduce((node, key) => node[key] as Record<string, unknown>, copy) as Record<string, unknown>)[leaf];
        return copy;
    };

    it.each([
        ['assistant.avatarAlt', ['home']],
        ['navigation.closeMenu', ['home']],
        ['cookieBanner.label', ['home']],
        ['portfolio.detail.fullScreenshotAlt', ['portfolio.detail']],
        ['portfolio.portfolioCarousel.slideAlt', ['portfolio.portfolioCarousel']],
        ['media.calBooking', ['media.calBooking']],
        ['card.hector.meta.ogImageAlt', ['card.hector']],
    ])('a locale missing %s does not publish the page that renders it', (path, keys) => {
        expect(localesWithKeys({ en, es }, keys)).toEqual(['en', 'es']);
        expect(localesWithKeys({ en, es: without(path) }, keys)).toEqual(['en']);
    });

    it('every page requires the alt and label keys of the components it renders', () => {
        const keysOf = (path: string) => ALL_ROUTES.find((r) => r.path === path)!.copyKeys ?? [];
        expect(keysOf('')).toContain('media.calBooking');
        for (const path of ['services/local-seo', 'services/website-development', 'services/ai-voice-receptionist', 'services/software-development']) {
            expect(keysOf(path), path).toContain('media.calBooking');
        }
        for (const route of ALL_ROUTES.filter((r) => /^portfolio\/./.test(r.path))) {
            expect(keysOf(route.path), route.path).toEqual(expect.arrayContaining(['portfolio.detail', 'portfolio.portfolioCarousel']));
        }
        expect(SHELL_KEYS).toEqual(expect.arrayContaining(['navigation', 'cookieBanner', 'assistant', 'home.meta']));
    });

    it.each([
        ['portfolio', 'portfolio.gerp-dj.badge'],
        ['news', 'news.items.gerp-dj-case-study.description'],
    ])('the %s index does not publish while one of its cards is untranslated', (path, cardKey) => {
        const keys = [...(ALL_ROUTES.find((r) => r.path === path)!.copyKeys ?? [])];
        expect(localesWithKeys({ en, es }, keys)).toEqual(['en', 'es']);
        expect(localesWithKeys({ en, es: without(cardKey) }, keys)).toEqual(['en']);
    });

    it('an index is only built where every page its cards link to is built', () => {
        for (const prefix of ['portfolio', 'news']) {
            for (const item of ALL_ROUTES.filter((r) => r.path.startsWith(`${prefix}/`))) {
                expect(item.locales, item.path).toEqual(expect.arrayContaining([...routeLocales(prefix)]));
            }
        }
    });
});

describe('languageAlternates', () => {
    it('lists only the given locales, keyed by BCP 47 tag, plus x-default', () => {
        expect(languageAlternates('news', ['en', 'en-gb', 'pt'])).toEqual({
            en: absoluteUrl('en', 'news'),
            'en-GB': absoluteUrl('en-gb', 'news'),
            'pt-PT': absoluteUrl('pt', 'news'),
            'x-default': absoluteUrl('en', 'news'),
        });
    });

    it('reads the route registry through routeAlternates', () => {
        expect(routeAlternates('privacy-policy')).toEqual({
            en: absoluteUrl('en', 'privacy-policy'),
            es: absoluteUrl('es', 'privacy-policy'),
            'x-default': absoluteUrl('en', 'privacy-policy'),
        });
    });
});

describe('links to pages per locale', () => {
    // Any page not yet translated into some locale; the rollout moves, so it is looked up, not named.
    const unpublished = ALL_ROUTES.flatMap((r) => LOCALES.filter((l) => !r.locales.includes(l)).map((l) => [r.path, l] as const))[0];

    it('knows where a page exists, whatever slashes the path carries', () => {
        expect(routeExists('/services/local-seo/', 'es')).toBe(true);
        expect(routeExists('no/such/page', 'en')).toBe(false);
        if (unpublished) expect(routeExists(`/${unpublished[0]}/`, unpublished[1])).toBe(false);
    });

    it('links a shell entry to the English page while the translation is not published', () => {
        expect(routeHref('es', '/services/local-seo')).toBe('/es/services/local-seo/');
        if (unpublished) {
            const [path, locale] = unpublished;
            expect(routeHref(locale, `/${path}`)).toBe(path ? `/en/${path}/` : '/en/');
        }
    });
});
