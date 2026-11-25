/**
 * Every family the root layout loads through `next/font/google` is preloaded
 * (`<link rel="preload" as="font">`, High priority) on EVERY page, before the
 * LCP element can paint. Noto Serif and Manrope were loaded this way while no
 * component used them: about 60 KiB of font on the critical path of each page
 * for nothing. Load a family only when the stylesheet actually uses it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const layout = readFileSync(path.join(process.cwd(), 'app/[locale]/layout.tsx'), 'utf8');

describe('web fonts loaded by the root layout', () => {
    it('loads only Inter from next/font/google', () => {
        const imported = layout.match(/import\s*\{([^}]*)\}\s*from\s*'next\/font\/google'/);

        expect(imported).not.toBeNull();
        expect(imported?.[1].split(',').map((name) => name.trim()).filter(Boolean)).toEqual(['Inter']);
    });
});
