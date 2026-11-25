/**
 * Build-time translations for Astro pages and components.
 *
 * Runs on `createTranslator` from `use-intl/core`, so `messages/*.json` (ICU
 * syntax, `t.raw()`, rich tags) is read as-is. `t.rich()` returns React nodes; in `.astro` files use
 * `t.markup()` and render it with `set:html`.
 */
import {
    createTranslator,
    IntlErrorCode,
    type AbstractIntlMessages,
    type MarkupTranslationValues,
    type RichTranslationValues,
    type TranslationValues,
} from 'use-intl/core';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import enGb from '@/messages/en-gb.json';
import gl from '@/messages/gl.json';
import pt from '@/messages/pt.json';
import it from '@/messages/it.json';
import fr from '@/messages/fr.json';
import de from '@/messages/de.json';
import nl from '@/messages/nl.json';
import { DEFAULT_LOCALE, LOCALES, localeInfo, type Locale } from '@/lib/site-config';

// The JSON holds arrays (read with t.raw), which AbstractIntlMessages does not model.
const MESSAGES = { en, es, 'en-gb': enGb, gl, pt, it, fr, de, nl } as unknown as Record<Locale, AbstractIntlMessages>;

/**
 * Copy every page renders through the shell (BaseLayout, Navbar, Footer,
 * CookieBanner, the ElevenLabs assistant). A page cannot exist in a locale
 * without it, whatever its own copy: that includes alt and aria-label text.
 * `home.meta` is here because BaseLayout builds its head defaults from it on
 * every page.
 */
export const SHELL_KEYS: readonly string[] = [
    'navigation',
    'cookieBanner',
    'assistant',
    'home.meta',
    'footer.description',
    'footer.copyright',
    'footer.agency',
    'footer.services',
    'footer.legal.title',
    'footer.legal.items',
];

/** The value at a dot path (array indexes included), or undefined. */
function at(tree: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>(
        (node, part) => (node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
        tree
    );
}

/** Every leaf path under `path` in `tree`; `path` itself when it is a leaf. */
function leaves(tree: unknown, path: string): string[] {
    const value = at(tree, path);
    if (value !== null && typeof value === 'object') {
        return Object.keys(value).flatMap((key) => leaves(tree, `${path}.${key}`));
    }
    return [path];
}

/**
 * THE rule for "page P exists in locale L": L's messages hold every given key
 * plus the shell keys. A key naming a subtree means every leaf the default
 * locale has under it, so a half translated namespace does not count. Pure so
 * it can be tested with fixture messages; `pageLocales` binds it to the files.
 *
 * Throws on a key the default locale lacks: that is a typo in the route
 * registry, and silently matching no locale would unpublish the page.
 */
export function localesWithKeys(messages: Partial<Record<string, unknown>>, keys: readonly string[]): Locale[] {
    const reference = messages[DEFAULT_LOCALE];
    const required = [...SHELL_KEYS, ...keys].flatMap((key) => {
        if (at(reference, key) === undefined) throw new Error(`Unknown message key "${key}" (missing from ${DEFAULT_LOCALE})`);
        return leaves(reference, key);
    });
    return LOCALES.filter((locale) => required.every((path) => at(messages[locale], path) !== undefined));
}

/** The locales whose messages hold the given page copy and the shell copy. */
export function pageLocales(...keys: string[]): Locale[] {
    return localesWithKeys(MESSAGES, keys);
}

/** Narrows an unknown route param to a supported locale, falling back to the default. */
export function resolveLocale(value: string | undefined): Locale {
    return (LOCALES as readonly string[]).includes(value ?? '') ? (value as Locale) : DEFAULT_LOCALE;
}

export function getMessages(locale: string): AbstractIntlMessages {
    return MESSAGES[resolveLocale(locale)];
}

/**
 * Without these handlers a missing key renders its own path into the DOM: a
 * page translated in `en` but not `es` silently ships text like
 * "services.localSeo.title" to users and to Google. Development and tests
 * throw so the omission is impossible to miss; production degrades to the last
 * path segment. Only MISSING_MESSAGE is escalated: formatting problems stay
 * warnings. `tests/i18n/messages-parity.test.ts` is the real guard; this is the
 * runtime backstop.
 */
/**
 * Keys are plain strings: namespaces are chosen at runtime (`news.items.${id}`),
 * which the key-typed translator cannot express. `messages-parity.test.ts` and
 * the dev-time throw above guard the keys instead.
 */
export interface Translator {
    (key: string, values?: TranslationValues): string;
    raw(key: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any
    markup(key: string, values?: MarkupTranslationValues): string;
    rich(key: string, values?: RichTranslationValues): ReturnType<ReturnType<typeof createTranslator>['rich']>;
    has(key: string): boolean;
}

export function getTranslations(locale: string, namespace?: string): Translator {
    return createTranslator({
        // The BCP 47 tag (`pt-PT`), not the URL code: ICU dates and numbers read it.
        locale: localeInfo(resolveLocale(locale)).tag,
        messages: getMessages(locale),
        namespace: namespace as never,
        timeZone: 'UTC',
        onError(error) {
            if (error.code === IntlErrorCode.MISSING_MESSAGE && import.meta.env.DEV) throw error;
            console.error(error);
        },
        getMessageFallback({ key, namespace: ns }) {
            if (import.meta.env.DEV) {
                throw new Error(`Missing translation: ${[ns, key].filter(Boolean).join('.')}`);
            }
            return key.split('.').pop() ?? key;
        },
    }) as unknown as Translator;
}
