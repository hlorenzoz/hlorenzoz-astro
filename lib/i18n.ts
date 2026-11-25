/**
 * Build-time translations for Astro pages and components.
 *
 * Runs on `createTranslator` from `use-intl/core`, the engine next-intl is
 * built on, so `messages/*.json` (ICU syntax, `t.raw()`, rich tags) keeps
 * working unchanged. `t.rich()` returns React nodes; in `.astro` files use
 * `t.markup()` and render it with `set:html`.
 */
import { createTranslator, IntlErrorCode, type AbstractIntlMessages } from 'use-intl/core';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/lib/site-config';

const MESSAGES: Record<Locale, AbstractIntlMessages> = { en, es };

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
export function getTranslations(locale: string, namespace?: string) {
    return createTranslator({
        locale: resolveLocale(locale),
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
    });
}

export type Translator = ReturnType<typeof getTranslations>;
