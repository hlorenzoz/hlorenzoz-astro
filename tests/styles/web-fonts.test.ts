/**
 * Every family the site loads through the Astro Fonts API (`fonts` in
 * `astro.config.mjs`, emitted by `<Font preload>` in BaseLayout) is preloaded
 * (`<link rel="preload" as="font">`, High priority) on EVERY page, before the
 * LCP element can paint. Noto Serif and Manrope were once loaded this way while
 * no component used them: about 60 KiB of font on the critical path of each
 * page for nothing. Load a family only when the stylesheet actually uses it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import config from '@/astro.config.mjs';

const layout = readFileSync(path.join(process.cwd(), 'src/layouts/BaseLayout.astro'), 'utf8');
const fonts = (config.fonts ?? []) as { name: string; cssVariable: string; styles?: string[] }[];

describe('web fonts loaded by the base layout', () => {
    it('configures only Inter', () => {
        expect(fonts.map((font) => font.name)).toEqual(['Inter']);
    });

    it('loads the normal style only, so italic copy keeps its synthesized look', () => {
        // Without `styles` the Fonts API also ships Inter Italic: a second preloaded
        // file, and italic paragraphs whose glyphs and line wraps change.
        expect(fonts.map((font) => font.styles)).toEqual([['normal']]);
    });

    it('renders a <Font> only for configured families', () => {
        const rendered = [...layout.matchAll(/<Font\s[^>]*cssVariable="([^"]+)"/g)].map((m) => m[1]);
        expect(rendered).toEqual(fonts.map((font) => font.cssVariable));
    });
});
