import { LOCALES } from '@/lib/routing';

/**
 * The agency dossier (`scripts/build-dossier.mjs`) is built in every site
 * locale, so each reader downloads the PDF in the language of the page. An
 * unknown locale falls back to the English one.
 */
export function dossierHref(locale: string): string {
    const language = (LOCALES as readonly string[]).includes(locale) ? locale : 'en';
    return `/dossier/lorenzoz-agency-dossier-${language}.pdf`;
}
