import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PORTFOLIO_TYPE_COLORS, portfolioTypeBadgeClass } from '@/lib/portfolio-theme';

/**
 * The portfolio type colours carry white 11px bold text, which WCAG treats as
 * SMALL text (the large-text threshold is 18.66px bold), so they owe 4.5:1
 * against white, not 3:1.
 *
 * That floor is one shade away for the green: `emerald-600` measures 3.77:1 and
 * fails, so `emerald-700` is the brightest legal green. (`red-600` does pass, at
 * 4.83:1; `red-700` is used for margin, not because 600 is illegal.) The palette
 * these replaced was `emerald-950` / `amber-950`, adopted after a real contrast
 * failure recorded in CHANGELOG.md 2.3.0.
 *
 * "Make the green brighter" is a completely reasonable request that silently
 * breaks accessibility, which is exactly why this is a test and not a comment.
 *
 * The guard closes a loop rather than hardcoding a verdict: the hex is pinned
 * per token, so changing a token to one with no pinned hex fails the first test
 * and forces whoever changed it to supply the real value, which the second test
 * then judges. Neither half is useful alone.
 */
const TAILWIND_HEX: Record<string, string> = {
    'bg-emerald-700': '#047857',
    'bg-red-700': '#b91c1c',
};

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio against white. */
function contrastWithWhite(hex: string): number {
    return 1.05 / (luminance(hex) + 0.05);
}

describe('portfolio type colours', () => {
    const entries = Object.entries(PORTFOLIO_TYPE_COLORS);

    it('covers both project types', () => {
        expect(entries.map(([type]) => type).sort()).toEqual(['demo', 'live']);
    });

    it.each(entries)('%s has a pinned hex so its contrast can be measured', (_type, color) => {
        expect(
            TAILWIND_HEX[color.surface],
            `${color.surface} has no hex in TAILWIND_HEX; add it with the value from the Tailwind palette`
        ).toBeDefined();
    });

    it.each(entries)('%s clears 4.5:1 against white for small text', (type, color) => {
        const ratio = contrastWithWhite(TAILWIND_HEX[color.surface]);
        expect(
            ratio,
            `${type} (${color.surface}) is ${ratio.toFixed(2)}:1 against white, under the 4.5:1 floor for 11px text`
        ).toBeGreaterThanOrEqual(4.5);
    });

    /*
     * Tailwind v4 emits utilities by scanning source text, so every class must
     * appear as a literal. A token assembled at runtime (`bg-` swapped for
     * `border-`) is never generated and the element renders with no colour at
     * all — a failure that looks like a styling bug, not a build bug.
     */
    it.each(entries)('%s declares its border tokens literally', (_type, color) => {
        expect(color.hairline).toBe(`${color.surface.replace('bg-', 'border-')}/30`);
        expect(color.edge).toBe(color.surface.replace('bg-', 'border-'));
    });

    describe('badge composition', () => {
        it.each(entries)('%s badge carries its own surface and no other', (type, color) => {
            const className = portfolioTypeBadgeClass(type as 'live' | 'demo');
            expect(className).toContain(color.surface);

            for (const [otherType, other] of entries) {
                if (otherType === type) continue;
                expect(className).not.toContain(other.surface);
            }
        });

        it('renders the compact size with a solid edge, not the hairline', () => {
            const compact = portfolioTypeBadgeClass('live', 'sm');
            expect(compact).toContain(PORTFOLIO_TYPE_COLORS.live.edge);
            expect(compact).not.toContain(PORTFOLIO_TYPE_COLORS.live.hairline);
            expect(compact).toContain('px-2');
        });

        it('defaults to the roomy size with the translucent hairline', () => {
            const roomy = portfolioTypeBadgeClass('live');
            expect(roomy).toContain(PORTFOLIO_TYPE_COLORS.live.hairline);
            expect(roomy).toContain('px-3');
        });
    });

    /**
     * The colours are a legend: a filter chip means "live" because it is the same
     * green as the badge on every live card. Three surfaces render that legend —
     * the index cards, the homepage carousel (two sizes), and the filter chip —
     * and each used to spell the colour out itself, so the promise held only by
     * coincidence. Recolouring one of them left the other two behind, and nothing
     * failed.
     *
     * Scanning the source is the only way to catch a re-hardcoding: a component
     * that inlines `bg-emerald-700` renders identically today and drifts the day
     * the token changes, so no render-based assertion can see it coming.
     */
    describe('no component hardcodes a type colour', () => {
        const SURFACES = ['src/components/PortfolioTypeFilter.astro', 'src/components/PortfolioCarousel.astro',
            'src/pages/[locale]/portfolio/index.astro'];

        // Matches the colour family regardless of shade or opacity suffix, so
        // reverting to `emerald-950` is caught just as `emerald-700` would be.
        const FAMILIES = /\b(?:bg|border|text)-(?:emerald|amber|red)-\d{2,3}\b/g;

        /*
         * Comments are stripped before scanning, for the reason
         * `dark-variant.test.ts` already learned the hard way: assertions are
         * about CODE, and prose that merely names a token is not a styling
         * decision. Explaining in a docblock that these badges used to be
         * `bg-emerald-950` is exactly the sort of note this guard should
         * encourage, and scanning raw text punished it.
         */
        const stripComments = (source: string) =>
            source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

        it('covers every surface that renders a type badge', () => {
            // `it.each([])` runs zero tests and reports green, so an emptied
            // list would silently retire the guard rather than fail it.
            expect(SURFACES.length).toBeGreaterThanOrEqual(3);
        });

        it.each(SURFACES)('%s takes its type colours from the theme module', (file) => {
            const source = stripComments(readFileSync(join(process.cwd(), file), 'utf8'));
            const inlined = [...new Set(source.match(FAMILIES) ?? [])];

            expect(
                inlined,
                `${file} inlines ${inlined.join(', ')}; import from lib/portfolio-theme instead`
            ).toEqual([]);
        });
    });
});
