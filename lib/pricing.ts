/**
 * The service keys, their slug helpers and the entry price.
 *
 * The agency publishes one figure only (see AGENTS.md): the entry price of the
 * first implementation, which commits both sides and takes the first steps.
 * Everything after it is tailored to the client and quoted after a free first
 * call, so no other amount lives in code.
 */

/** The only published price: the first implementation, VAT excluded. */
export const ENTRY_PRICE = { amount: 500, currency: 'EUR', vatIncluded: false } as const;

/** The entry price in the reader's number format (`localeInfo(locale).intl`): "€500", "500 €". */
export function formatEntryPrice(intlLocale: string): string {
    return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: ENTRY_PRICE.currency,
        maximumFractionDigits: 0,
    }).format(ENTRY_PRICE.amount);
}

/** Service keys mirror the slugs registered in `lib/routes.ts`, camel-cased. */
export type ServiceKey =
    | 'localSeo'
    | 'websiteDevelopment'
    | 'aiVoiceReceptionist'
    | 'softwareDevelopment';

/** Every service, Local SEO first: the dossier gives it its own page and lists the rest after it. */
export const SERVICE_KEYS: readonly ServiceKey[] = [
    'localSeo',
    'websiteDevelopment',
    'aiVoiceReceptionist',
    'softwareDevelopment',
];

/** The order the home's Solutions grid and the services hub show the services in. */
export const SERVICE_DISPLAY_ORDER: readonly ServiceKey[] = [
    'websiteDevelopment',
    'localSeo',
    'aiVoiceReceptionist',
    'softwareDevelopment',
];

/** Maps a route slug ('local-seo') to its service key ('localSeo'). */
export function serviceKeyFromSlug(slug: string): ServiceKey {
    return slug.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase()) as ServiceKey;
}

/** Maps a service key ('localSeo') back to its route slug ('local-seo'). */
export function slugFromServiceKey(key: ServiceKey): string {
    return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
