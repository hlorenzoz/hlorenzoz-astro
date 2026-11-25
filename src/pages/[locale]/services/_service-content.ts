/**
 * The `defineContentPage` instances behind the service pages.
 *
 * Built at module scope, once per locale: `defineContentPage` validates path
 * registration, kind/tier agreement and the title budget at import time, not
 * on every render. Two instances because the factory's `title`/`description`
 * are plain strings and this site's copy is bilingual. The copy is read
 * straight from the message files, as the Next pages did.
 *
 * Lives next to the pages (the `_` prefix keeps it unrouted) so
 * `tests/seo/service-pages-config.test.ts` can exercise the real configs.
 */
import { defineContentPage, type CategoryPageConfig, type ContentPage } from '@/lib/service-page';
import { BUNDLE_DISCOUNT, PRICING, slugFromServiceKey, type ServiceKey } from '@/lib/pricing';
import { fillTokens } from '@/lib/copy-tokens';
import type { Locale } from '@/lib/site-config';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';

export const LOCALE_MESSAGES = { en: enMessages, es: esMessages } as const;

/** The hub subtitle states the bundle discount, which lives in `lib/pricing.ts`. */
export const HUB_TOKENS = { discount: Math.round(BUNDLE_DISCOUNT * 100) };

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
        // Resolved here: this string becomes the meta description, so a raw
        // "{discount}" would otherwise reach the search result snippet.
        description: fillTokens(hub.subtitle, HUB_TOKENS),
    };
}

export const hubContentPages: Record<Locale, ContentPage> = {
    en: defineContentPage(hubConfig('en')),
    es: defineContentPage(hubConfig('es')),
};

function serviceContentPages(key: ServiceKey): Record<Locale, ContentPage> {
    const build = (locale: Locale) => {
        const s = LOCALE_MESSAGES[locale].services[key];
        return defineContentPage({
            path: `services/${slugFromServiceKey(key)}`,
            kind: 'service',
            title: s.meta.title,
            description: s.meta.description,
            name: s.hero.title,
            faq: s.faq.items,
            // The published price, from the single source of truth. The page
            // shows it AND emits it as an Offer from the same object.
            offer: PRICING[key],
        });
    };
    return { en: build('en'), es: build('es') };
}

export const serviceContentPagesByKey: Record<ServiceKey, Record<Locale, ContentPage>> = {
    localSeo: serviceContentPages('localSeo'),
    websiteDevelopment: serviceContentPages('websiteDevelopment'),
    aiVoiceReceptionist: serviceContentPages('aiVoiceReceptionist'),
    softwareDevelopment: serviceContentPages('softwareDevelopment'),
};
