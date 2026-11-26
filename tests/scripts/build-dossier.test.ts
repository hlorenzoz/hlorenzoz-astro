import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    BOOKING_URL,
    escapeHtml,
    renderDossier,
} from '../../scripts/build-dossier.mjs';
import { ORGANIZATION, marketNames } from '@/lib/site-config';
import { SERVICE_KEYS } from '@/lib/pricing';
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
 * The agency publishes no price: every solution is quoted after a free first
 * call. The dossier is handed to prospects, so it must not print one either.
 */
describe('the dossier prints no price', () => {
    it.each(['es', 'en'] as const)('shows no amount and no tax marker (%s)', (locale) => {
        const html = render(locale);
        expect(html).not.toMatch(/€\s?\d|\d\s?€|EUR\s?\d/);
        expect(html).not.toContain('<span class="tax">');
    });

    it('says every solution is quoted after the free needs analysis, excluding VAT', () => {
        expect(render('en')).toContain('quoted after the free needs analysis');
        expect(render('en')).toContain('Quotes exclude VAT');
        expect(render('es')).toContain('se presupuesta tras el análisis de necesidades gratuito');
        expect(render('es')).toContain('no incluyen IVA');
    });

    it.each(['es', 'en'] as const)('states the fee model, an initial payment then a monthly fee, with no share (%s)', (locale) => {
        const html = render(locale);
        // The CSS uses percentages (50% radii, gradient stops), so match the copy's wording.
        expect(html).not.toMatch(/\d\s?% (of|up|del|por)/i);
        expect(html).not.toMatch(/up front|por adelantado/i);
    });

    it('describes the initial payment and the monthly fee tied to results', () => {
        expect(render('en')).toContain('A low initial payment when the services start, then a monthly fee tied to the results we bring you');
        expect(render('es')).toContain('Un pago inicial bajo al comenzar los servicios y, después, una cuota mensual ligada a los resultados');
    });
});

/**
 * The agency is a partner: a needs analysis first, then one tailored solution
 * built from four services. None of them is a core offer with options around it.
 */
describe('the dossier tells the partner model', () => {
    it.each(['es', 'en'] as const)('names no core offer and no optional services (%s)', (locale) => {
        expect(render(locale)).not.toMatch(/core offer|oferta central|optional services|servicios opcionales|add-?on/i);
    });

    it('presents Local SEO and then the other three services, in the order the site lists them', () => {
        for (const content of [esContent, enContent]) {
            expect(content.localSeo.pillars).toHaveLength(3);
            expect(JSON.stringify(content.localSeo)).not.toMatch(/backlink|citation|citaci/i);
            expect(content.blocks.items.map((item) => item.key)).toEqual(SERVICE_KEYS.slice(1));
        }
        expect(SERVICE_KEYS[0]).toBe('localSeo');
    });

    it('explains how we work in four steps, starting with the free needs analysis', () => {
        expect(enContent.approach.steps.map((step) => step.title)).toEqual([
            'Needs analysis',
            'A tailored solution',
            'We put it to work',
            'We measure and adjust',
        ]);
        expect(esContent.approach.steps).toHaveLength(4);
        expect(esContent.approach.steps[0].title).toBe('Análisis de necesidades');
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

    it('joins no words with a hyphen (AGENTS.md: no hyphens in copy)', () => {
        for (const content of [esContent, enContent]) {
            expect(JSON.stringify(content)).not.toMatch(/\p{L}-\p{L}/u);
        }
    });
});

describe.each(['es', 'en'] as const)('renderDossier(%s)', (locale) => {
    const html = render(locale);

    it('renders six A4 pages', () => {
        expect(html.match(/<section class="page[ "]/g)).toHaveLength(6);
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
        const source = readFileSync(join(ROOT, 'src/components/services/CalBooking.astro'), 'utf8');
        expect(source).toContain(BOOKING_URL);
    });
});
