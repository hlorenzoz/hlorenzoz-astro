/**
 * Guards the cascade layer the `.prose` overrides live in.
 *
 * @tailwindcss/typography emits its own `.prose` block into `@layer utilities`.
 * CSS cascade layers resolve in declaration order (theme -> base -> components
 * -> utilities) and the LATER layer wins, so an override placed in
 * `@layer components` loses to the plugin and becomes dead CSS.
 *
 * That is not hypothetical: it shipped. The built bundle carried both
 * `.prose{--tw-prose-body:var(--color-gray-600)}` (components) and
 * `.prose{--tw-prose-body:oklch(37.3% .034 259.733)}` (utilities), and the
 * plugin's stock gray won every time. The bug is invisible to lint, types, and
 * the build, and grepping the artifact for the variable NAME still finds it.
 * Only the layer tells you which value applies.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');

/**
 * Returns the name of the `@layer` block containing `index`, or null when the
 * position sits at the top level. Brace-counts rather than regex-matching so
 * nested rules inside a layer do not confuse the lookup.
 */
function enclosingLayer(index: number): string | null {
    const layerStart = /@layer\s+([a-z-]+)\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = layerStart.exec(css)) !== null) {
        if (match.index > index) break;
        // Walk from this layer's opening brace to its matching close.
        let depth = 0;
        let i = match.index + match[0].length - 1;
        for (; i < css.length; i++) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') {
                depth--;
                if (depth === 0) break;
            }
        }
        if (index > match.index && index < i) return match[1];
    }
    return null;
}

describe('.prose overrides sit in the winning cascade layer', () => {
    const proseRules = [...css.matchAll(/^\s*\.prose[\s{:]/gm)].map((m) => m.index ?? 0);

    it('declares at least one .prose rule', () => {
        expect(proseRules.length).toBeGreaterThan(0);
    });

    it('places every .prose rule in @layer utilities, never components', () => {
        for (const index of proseRules) {
            const layer = enclosingLayer(index);
            const excerpt = css.slice(index, index + 60).split('\n')[0].trim();
            expect(layer, `"${excerpt}" is in @layer ${layer}, which loses to the typography plugin`)
                .toBe('utilities');
        }
    });

    it('loads the typography plugin, without which .prose styles nothing', () => {
        expect(css).toMatch(/@plugin\s+["']@tailwindcss\/typography["']/);
    });

    it('keeps the plugin declaration after the tailwind import', () => {
        const importAt = css.indexOf('@import "tailwindcss"');
        const pluginAt = css.search(/@plugin\s+["']@tailwindcss\/typography["']/);
        expect(importAt).toBeGreaterThanOrEqual(0);
        expect(pluginAt).toBeGreaterThan(importAt);
    });
});
