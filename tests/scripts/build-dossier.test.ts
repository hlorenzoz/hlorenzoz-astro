import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    BOOKING_URL,
    escapeHtml,
    renderDossier,
} from '../../scripts/build-dossier.mjs';
import { ORGANIZATION, marketNames } from '@/lib/site-config';
import { PRICING, bundledAmount, formatAmount, offersByRole } from '@/lib/pricing';
import esContent from '../../dossier/content.es.json';
import enContent from '../../dossier/content.en.json';

const ROOT = process.cwd();
const template = readFileSync(join(ROOT, 'dossier/template.html'), 'utf8');
const CONTENT = { es: esContent, en: enContent } as const;

function render(locale: 'es' | 'en') {
    return renderDossier({
        locale,
        content: CONTENT[locale],
        template,
        organization: ORGANIZATION,
        markets: marketNames(locale),
        qrSvg: '<svg data-testid="qr"></svg>',
    });
}

/** Key shape of a JSON tree, with array indices collapsed so lengths may differ. */
function shape(value: unknown, path = ''): string[] {
    if (Array.isArray(value)) return value.flatMap((item) => shape(item, `${path}[]`));
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([key, child]) => shape(child, `${path}.${key}`));
    }
    return [path];
}

/**
 * The dossier used to carry its own copy of the price list. It reads
 * `lib/pricing.ts` now, the same source the site reads, and these tests are
 * written against that source rather than against literals: change a price
 * there and both the site and the dossier follow, with nothing here to edit.
 */
describe('the dossier prints the prices the site publishes', () => {
    it.each(['es', 'en'] as const)('shows the core plan at its published price (%s)', (locale) => {
        expect(render(locale)).toContain(formatAmount(PRICING.localSeo.base.amount, locale));
    });

    it.each(['es', 'en'] as const)('shows the list and the bundled price of every optional service (%s)', (locale) => {
        const html = render(locale);
        for (const key of offersByRole('addOn')) {
            const { amount } = PRICING[key].base;
            expect(html, `${key} list price`).toContain(formatAmount(amount, locale));
            expect(html, `${key} bundled price`).toContain(formatAmount(bundledAmount(amount), locale));
        }
    });

    it('names exactly the live optional services, in the order the site lists them', () => {
        for (const content of [esContent, enContent]) {
            expect(content.addOns.items.map((item) => item.key)).toEqual(offersByRole('addOn'));
        }
    });
});

describe('escapeHtml()', () => {
    it('escapes the characters that would break out of text or an attribute', () => {
        expect(escapeHtml('<a href="x">Tom & Co</a>')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Co&lt;/a&gt;');
    });
});

describe('dossier content', () => {
    it('has the same key shape in both languages', () => {
        expect(new Set(shape(enContent))).toEqual(new Set(shape(esContent)));
    });

    it('describes four pillars and three add-ons in each language', () => {
        for (const content of [esContent, enContent]) {
            expect(content.core.pillars).toHaveLength(4);
            expect(content.addOns.items.map((item) => item.key)).toEqual([
                'websiteDevelopment',
                'aiVoiceReceptionist',
                'softwareDevelopment',
            ]);
        }
    });
});

describe.each(['es', 'en'] as const)('renderDossier(%s)', (locale) => {
    const html = render(locale);

    it('renders seven A4 pages', () => {
        expect(html.match(/<section class="page[ "]/g)).toHaveLength(7);
    });

    it('leaves no placeholder unresolved', () => {
        expect(html).not.toMatch(/\{\{|\}\}/);
        expect(html).not.toContain('undefined');
    });

    it('carries no banned typographic characters', () => {
        expect(html).not.toMatch(/[\u2014\u2013\u2018\u2019\u201C\u201D\u2026\u00A0\u202F]/);
    });

    it('takes the contact details from the site config', () => {
        expect(html).toContain(`mailto:${ORGANIZATION.email}`);
        expect(html).toContain(`tel:${ORGANIZATION.telephone}`);
        expect(html).toContain(BOOKING_URL);
        expect(html).toContain('data-testid="qr"');
    });

    it('lists every served market', () => {
        for (const name of marketNames(locale)) expect(html).toContain(name);
    });

    it('does not sell the paused Digital Business Card', () => {
        expect(html).not.toMatch(/Digital Business Card|Tarjeta Digital|Tarjetas Digitales/i);
    });

    it('declares the set language', () => {
        expect(html).toContain(`<html lang="${locale}">`);
    });
});

describe('prices in the rendered dossier', () => {
    it('shows list and bundled prices in Spanish form', () => {
        const html = render('es');
        for (const figure of ['750 €', '2.500 €', '1.750 €', '350 €', '245 €', '20.000 €', '14.000 €']) {
            expect(html).toContain(figure);
        }
    });

    it('shows list and bundled prices in English form', () => {
        const html = render('en');
        for (const figure of ['€750', '€2,500', '€1,750', '€350', '€245', '€20,000', '€14,000']) {
            expect(html).toContain(figure);
        }
    });

    it('quotes the former standalone prices once each, as the comparison, and nowhere else', () => {
        for (const [locale, figures] of [['es', ['897 €', '297 €', '1.194 €']], ['en', ['€897', '€297', '€1,194']]] as const) {
            const html = render(locale);
            for (const figure of figures) expect(html.split(figure)).toHaveLength(2);
        }
    });

    it('never prints the retired entry price', () => {
        for (const locale of ['es', 'en'] as const) {
            expect(render(locale)).not.toMatch(/\b(1[.,]000 ?€|€1,000)\b/);
        }
    });

    it('works the cost of a missed customer out of the plan price', () => {
        const html = render('es');
        // 750 a month is 9,000 a year; one 2,500 customer lost a month is 30,000.
        expect(html).toContain('9.000 €');
        expect(html).toContain('30.000 €');
    });
});

describe('tax marker in the rendered dossier', () => {
    const MARKER = { es: '+ IVA', en: '+ VAT' } as const;

    // The core band, the plan, three ledger rows and three add-on cards.
    it.each(['es', 'en'] as const)('tags every quoted price as before tax (%s)', (locale) => {
        const html = render(locale);
        expect(html.match(/<span class="tax">/g)).toHaveLength(8);
        expect(html.split(`<span class="tax">${MARKER[locale]}</span>`)).toHaveLength(9);
    });

    it('carries the marker into the yearly cost of the plan', () => {
        expect(render('es')).toContain('9.000 € + IVA');
        expect(render('en')).toContain('€9,000 + VAT');
    });

    it('does not leak the Spanish marker into the English dossier', () => {
        expect(render('en')).not.toContain('IVA');
    });
});

describe('print stylesheet', () => {
    // Chromium writes each of these into the PDF as a soft-masked image or a
    // clipped shading. macOS Preview (Quartz) ignores the mask and paints the
    // whole bounding box: blurred shadows became solid gray blocks and the
    // gradient headline a solid blue rectangle. pdf.js tinted the translucent
    // gradients red. A PDF for clients has to survive every viewer.
    const css = template.slice(template.indexOf('<style>'), template.indexOf('</style>'));
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

    it.each(['box-shadow', 'background-clip', 'text-fill-color', 'filter:', 'opacity:'])('does not use %s', (property) => {
        expect(rules).not.toContain(property);
    });

    it('keeps every gradient stop opaque', () => {
        const gradients = rules.match(/(?:radial|linear)-gradient\([^;]+;/g) ?? [];
        expect(gradients.length).toBeGreaterThan(0);
        for (const gradient of gradients) expect(gradient).not.toMatch(/rgba|transparent/);
    });
});

describe('BOOKING_URL', () => {
    // The booking link is hardcoded in the site's Cal.com embed. This keeps the
    // dossier pointing at the same calendar instead of a second, typed-in copy.
    it('is the calendar the site embeds', () => {
        const source = readFileSync(join(ROOT, 'components/services/CalBooking.tsx'), 'utf8');
        expect(source).toContain(BOOKING_URL);
    });
});
