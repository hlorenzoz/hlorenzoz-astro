import { describe, it, expect } from 'vitest';
import { offerNotes } from '@/lib/offer-notes';
import { PRICING } from '@/lib/pricing';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

/**
 * The prose that describes an offer used to be assembled inside `lib/schema`,
 * in hardcoded English. It shipped: a Spanish service page published
 * `"Includes 1 Tarjeta Digital, maintenance included, at no charge"`, an English
 * sentence with Spanish nouns spliced in, on a node declaring `inLanguage: es`.
 *
 * Prose belongs to the copy layer. `lib/schema` stays free of i18n and takes
 * finished sentences; this module builds them from the message catalogue.
 */
const translator = (locale: 'en' | 'es') => {
    const messages = (locale === 'en' ? en : es) as unknown as Record<string, unknown>;
    return (key: string, values?: Record<string, string | number>): string => {
        const raw = key
            .split('.')
            .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
        return String(raw ?? key).replace(/\{(\w+)\}/g, (_, name: string) =>
            String(values?.[name] ?? `{${name}}`)
        );
    };
};

describe('offerNotes', () => {
    it('states the terms of the core offer: half up front, before tax', () => {
        expect(offerNotes(PRICING.localSeo, translator('en'))).toEqual([
            '50% is paid up front.',
            'The price does not include VAT.',
        ]);
    });

    it('adds the bundle discount to an optional service, naming the core offer', () => {
        // The percentage IS published now, because it is defined: 30%, alongside
        // Local SEO. What stays forbidden is a discount with no stated condition.
        expect(offerNotes(PRICING.aiVoiceReceptionist, translator('en'))).toEqual([
            '30% off the list price when taken alongside Local SEO.',
            '50% is paid up front.',
            'The price does not include VAT.',
        ]);
    });

    it('says a floor is a floor before anything else', () => {
        const notes = offerNotes(PRICING.softwareDevelopment, translator('en'));
        expect(notes[0]).toBe('Starting price: the final quote depends on the functional requirements.');
        expect(notes).toHaveLength(4);
    });

    it('writes the same notes in Spanish, with no English left in them', () => {
        const notes = offerNotes(PRICING.websiteDevelopment, translator('es')).join(' ');
        expect(notes).not.toMatch(/off the list|up front|does not include|alongside/i);
        expect(notes).toContain('SEO Local');
        expect(notes).toContain('30%');
        expect(notes).toContain('IVA');
    });

    it('never mentions a free trial', () => {
        for (const locale of ['en', 'es'] as const) {
            for (const offer of Object.values(PRICING)) {
                expect(offerNotes(offer, translator(locale)).join(' ')).not.toMatch(/trial|prueba/i);
            }
        }
    });

    it('leaves no placeholder unresolved', () => {
        for (const locale of ['en', 'es'] as const) {
            for (const offer of Object.values(PRICING)) {
                expect(offerNotes(offer, translator(locale)).join(' ')).not.toMatch(/[{}]/);
            }
        }
    });
});
