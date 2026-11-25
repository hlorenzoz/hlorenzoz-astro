/**
 * Locks the `dark:` variant to an explicit class.
 *
 * Tailwind v4 defaults `dark:` to `@media (prefers-color-scheme: dark)`. This
 * site has no dark theme — `:root` declares `color-scheme: light`, `--bg-color`
 * is `#ffffff` with no dark override, sections hardcode `bg-white` — so under
 * that default the handful of components carrying `dark:` classes flipped to a
 * dark skin on a permanently white page for any visitor whose OS was dark. The
 * ElevenLabs widget composited to a mid-grey card and its shrink icon fell to
 * 2.67:1, under the 3:1 WCAG 1.4.11 floor for graphical objects.
 *
 * The project *had* `darkMode: 'class'`, in `tailwind.config.ts.old`, which
 * stopped being read at the v4 migration. That is exactly how the default crept
 * back in, and exactly why this needs a test rather than a comment: deleting one
 * line of CSS silently restores the whole bug class across every component.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const source = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');

// Assertions are about rules, not prose. The block comment above the variant
// declaration quotes `prefers-color-scheme: dark` while explaining why the
// site does not use it, and a naive scan of the raw file matches that sentence.
const css = source.replace(/\/\*[\s\S]*?\*\//g, '');

describe('dark: variant configuration', () => {
    it('declares a custom dark variant', () => {
        expect(css).toMatch(/@custom-variant\s+dark\s/);
    });

    it('gates the dark variant on a .dark class, not the OS preference', () => {
        const declaration = css.match(/@custom-variant\s+dark\s*\(([^)]*)\)/);

        expect(declaration).not.toBeNull();
        expect(declaration?.[1]).toContain('.dark');
    });

    it('never reintroduces an OS-preference dark block', () => {
        // A `prefers-color-scheme: dark` rule anywhere in the sheet would put
        // part of the UI back on the reader's OS setting while the rest of the
        // site stays light — the inconsistency this configuration removes.
        expect(css).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
    });

    it('keeps the light-only theme the variant assumes', () => {
        // If a real dark theme ever lands, these assumptions change and this
        // test should be revisited deliberately rather than silently.
        expect(css).toMatch(/color-scheme:\s*light/);
        expect(css).toMatch(/--bg-color:\s*#ffffff/);
    });
});
