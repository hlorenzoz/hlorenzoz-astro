/**
 * The terms every quote shares, and the service keys.
 *
 * The agency publishes no price (see AGENTS.md): every solution is tailored to
 * the client and quoted after a free first call. What stays fixed is how a quote
 * is paid, so that is the only figure kept here.
 */

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

/** Share of the agreed quote paid up front. */
export const UPFRONT_SHARE = 0.5;

/** Maps a route slug ('local-seo') to its service key ('localSeo'). */
export function serviceKeyFromSlug(slug: string): ServiceKey {
    return slug.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase()) as ServiceKey;
}

/** Maps a service key ('localSeo') back to its route slug ('local-seo'). */
export function slugFromServiceKey(key: ServiceKey): string {
    return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
