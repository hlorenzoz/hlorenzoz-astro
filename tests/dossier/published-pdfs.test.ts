import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The site links the dossier at these exact paths. They are copies of the
 * `just dossier` output, committed because the static build only ships what
 * sits in `public/`.
 */
describe.each(['en', 'es'])('public/dossier/lorenzoz-agency-dossier-%s.pdf', (locale) => {
    it('exists and is a PDF', () => {
        const pdf = readFileSync(join(process.cwd(), 'public/dossier', `lorenzoz-agency-dossier-${locale}.pdf`));
        expect(pdf.subarray(0, 4).toString('latin1')).toBe('%PDF');
    });
});
