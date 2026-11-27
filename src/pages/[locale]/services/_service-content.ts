/**
 * The `defineContentPage` instances behind the service pages.
 *
 * Built at module scope, once per locale: `defineContentPage` validates path
 * registration, kind/tier agreement and the title budget at import time, not
 * on every render. One instance per locale the page is built in
 * (`routeLocales`), because the factory's `title`/`description` are plain
 * strings. The copy is read straight from the message files, as the Next pages
 * did.
 *
 * Lives next to the pages (the `_` prefix keeps it unrouted) so
 * `tests/seo/service-pages-config.test.ts` can exercise the real configs.
 */
import { defineContentPage, type CategoryPageConfig, type ContentPage } from '@/lib/service-page';
import { slugFromServiceKey, type ServiceKey } from '@/lib/pricing';
import { LOCALES, localeInfo, type Locale } from '@/lib/site-config';
import { copyTokens, resolveFaq } from '@/lib/copy-tokens';
import { getMessages } from '@/lib/i18n';
import { routeLocales } from '@/lib/routes';
import type enMessages from '@/messages/en.json';

/**
 * Typed with the default locale's shape. Only safe to read for a locale a page
 * is built in: `routeLocales` guarantees that locale's file holds the page's
 * copy, while the rest of an untranslated file is empty.
 */
export const LOCALE_MESSAGES = Object.fromEntries(LOCALES.map((locale) => [locale, getMessages(locale)])) as unknown as Record<
    Locale,
    typeof enMessages
>;

/** One content page per locale `path` is built in; absent for the others. */
export type LocaleContentPages = Partial<Record<Locale, ContentPage>>;

const pagesFor = (path: string, build: (locale: Locale) => ContentPage): LocaleContentPages =>
    Object.fromEntries(routeLocales(path).map((locale) => [locale, build(locale)]));

/** The page for a locale `getStaticPaths` built; a miss means the two read different registries. */
export function contentPageFor(pages: LocaleContentPages, locale: Locale): ContentPage {
    const page = pages[locale];
    if (!page) throw new Error(`No content page for locale "${locale}"`);
    return page;
}

/**
 * Core 30 hub: the category page that groups the service pages beneath it.
 * `kind: 'category'` must agree with `services`' tier in `lib/routes.ts`, or
 * `defineContentPage` throws at import time.
 */
function hubConfig(locale: Locale): CategoryPageConfig {
    const hub = LOCALE_MESSAGES[locale].services.hub;
    return {
        path: 'services',
        kind: 'category',
        title: hub.title,
        description: hub.subtitle,
    };
}

export const hubContentPages: LocaleContentPages = pagesFor('services', (locale) => defineContentPage(hubConfig(locale)));

function serviceContentPages(key: ServiceKey): LocaleContentPages {
    const path = `services/${slugFromServiceKey(key)}`;
    const build = (locale: Locale) => {
        const s = LOCALE_MESSAGES[locale].services[key];
        return defineContentPage({
            path,
            kind: 'service',
            title: s.meta.title,
            description: s.meta.description,
            name: s.hero.title,
            faq: resolveFaq(s.faq.items, copyTokens(localeInfo(locale).intl)),
        });
    };
    return pagesFor(path, build);
}

export const serviceContentPagesByKey: Record<ServiceKey, LocaleContentPages> = {
    localSeo: serviceContentPages('localSeo'),
    websiteDevelopment: serviceContentPages('websiteDevelopment'),
    aiVoiceReceptionist: serviceContentPages('aiVoiceReceptionist'),
    aiBusinessAutomation: serviceContentPages('aiBusinessAutomation'),
    softwareDevelopment: serviceContentPages('softwareDevelopment'),
};
