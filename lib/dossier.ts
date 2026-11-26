/**
 * The agency dossier (`scripts/build-dossier.mjs`) is built in English and
 * Spanish only, so Spanish and Galician readers download the Spanish PDF and
 * every other locale the English one.
 */
const SPANISH_READERS: readonly string[] = ['es', 'gl'];

export function dossierHref(locale: string): string {
    return `/dossier/lorenzoz-agency-dossier-${SPANISH_READERS.includes(locale) ? 'es' : 'en'}.pdf`;
}
