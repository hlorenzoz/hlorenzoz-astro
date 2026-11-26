import { describe, it, expect } from 'vitest';
import { LOCALES } from '@/lib/routing';
import { dossierHref } from '@/lib/dossier';

/**
 * The dossier is built in every site locale, so each reader downloads the PDF
 * in the language of the page they are on.
 */
describe('dossierHref', () => {
    it.each(LOCALES)('gives %s its own PDF', (locale) => {
        expect(dossierHref(locale)).toBe(`/dossier/lorenzoz-agency-dossier-${locale}.pdf`);
    });

    it('falls back to the English PDF for an unknown locale', () => {
        expect(dossierHref('xx')).toBe('/dossier/lorenzoz-agency-dossier-en.pdf');
    });
});
