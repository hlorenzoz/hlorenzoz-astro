import { describe, it, expect } from 'vitest';
import { LOCALES } from '@/lib/routing';
import { dossierHref } from '@/lib/dossier';

/**
 * The dossier is built in English and Spanish only, so every locale downloads
 * one of the two: Spanish and Galician readers get the Spanish PDF, everyone
 * else the English one.
 */
describe('dossierHref', () => {
    it.each(['es', 'gl'])('gives %s the Spanish PDF', (locale) => {
        expect(dossierHref(locale)).toBe('/dossier/lorenzoz-agency-dossier-es.pdf');
    });

    it.each(LOCALES.filter((l) => l !== 'es' && l !== 'gl'))('gives %s the English PDF', (locale) => {
        expect(dossierHref(locale)).toBe('/dossier/lorenzoz-agency-dossier-en.pdf');
    });
});
