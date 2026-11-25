import type { PortfolioItem } from '@/lib/portfolio';

/**
 * The one place the two project types get a colour.
 *
 * This is its own module, NOT part of `lib/portfolio.ts`, for the reason spelled
 * out at the top of `lib/routes.ts`: `lib/portfolio.ts` imports
 * `portfolio-data.json` at module scope, so a client script reaching in for a
 * style token would drag the whole catalogue into the browser bundle. Only the
 * `PortfolioItem` TYPE is imported here, which erases at compile time.
 *
 * Centralising these matters beyond tidiness. The colours are a legend: the
 * filter chip means "live" because it is the same green as the badge on every
 * live card. Three files used to hardcode `emerald-950` and `amber-950`
 * independently, so that promise held only by coincidence, and recolouring one
 * surface silently broke the association everywhere else.
 *
 * THE SHADE IS LOAD-BEARING, so read this before brightening either one.
 *
 * The badge label is 11px bold, which is below the 18.66px that WCAG counts as
 * large text, so it needs 4.5:1 against white, not 3:1. Measured against
 * #ffffff:
 *
 *   emerald-700 #047857  5.48:1  ✅ (used)
 *   emerald-600 #059669  3.77:1  ❌ fails small text
 *   red-700     #b91c1c  6.47:1  ✅ (used)
 *   red-600     #dc2626  4.83:1  ✅ passes, but on a 0.33 margin
 *
 * So `emerald-700` is a hard ceiling: the next step up genuinely fails. `red-700`
 * is a soft one, chosen to keep a comparable margin rather than because red-600
 * is illegal.
 *
 * These replaced `emerald-950` / `amber-950`, which cleared contrast easily but
 * read as near-black and dark brown rather than as green and red. The 2.3.0
 * entry in CHANGELOG.md records the last time these badges failed a contrast
 * audit; `tests/styles/portfolio-type-colors.test.ts` recomputes the ratio
 * from the pinned hex so the next brightening cannot repeat it.
 */
export const PORTFOLIO_TYPE_COLORS = {
    live: { surface: 'bg-emerald-700', hairline: 'border-emerald-700/30', edge: 'border-emerald-700' },
    demo: { surface: 'bg-red-700', hairline: 'border-red-700/30', edge: 'border-red-700' },
} as const satisfies Record<
    PortfolioItem['type'],
    { surface: string; hairline: string; edge: string }
>;

export type PortfolioType = keyof typeof PORTFOLIO_TYPE_COLORS;

/**
 * Geometry presets for the type badge.
 *
 * `md` sits on the portfolio cards and on the carousel's desktop overlay, both
 * over imagery, where a translucent hairline is enough to separate the pill.
 * `sm` is the carousel's mobile strip, which sits on a light panel and needs a
 * solid edge to stay defined. The two were already drawn this way; the sizes are
 * named here so that reusing one is a choice rather than a copy.
 */
const BADGE_SIZES = {
    md: { box: 'gap-1.5 px-3 py-1', border: 'hairline' },
    sm: { box: 'gap-1 px-2 py-0.5', border: 'edge' },
} as const satisfies Record<string, { box: string; border: 'hairline' | 'edge' }>;

/**
 * The small pill on a portfolio card that names the project's type.
 *
 * Every class here is a LITERAL in this file. Tailwind v4 generates utilities by
 * scanning source text, so a class assembled at runtime (`bg-` swapped for
 * `border-`, a colour interpolated from a variable) is never emitted and the
 * element renders unstyled. That is why `edge` is declared alongside `surface`
 * rather than derived from it.
 */
export function portfolioTypeBadgeClass(
    type: PortfolioType,
    size: keyof typeof BADGE_SIZES = 'md'
): string {
    const color = PORTFOLIO_TYPE_COLORS[type];
    const { box, border } = BADGE_SIZES[size];
    return `inline-flex items-center ${box} rounded-full ${color.surface} border ${color[border]} text-white text-[11px] font-bold tracking-widest uppercase`;
}

/**
 * The filter chip's SELECTED state, which is why it reuses `surface`: a chip
 * that highlighted in some neutral colour would not read as "showing the green
 * ones".
 */
export function portfolioTypeChipClass(type: PortfolioType): string {
    return `${PORTFOLIO_TYPE_COLORS[type].surface} text-white border-transparent`;
}
