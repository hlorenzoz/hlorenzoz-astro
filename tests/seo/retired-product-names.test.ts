import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * The service was deliberately renamed from "AI Voice Assistant" to "AI Voice
 * Receptionist" (ES: "Recepcionista de Voz IA") because the new name says what
 * it does, answer inbound calls and book appointments, instead of suggesting a
 * generic chatbot.
 *
 * A rename only holds if something enforces it. Without a guard, the retired
 * name creeps back in through drafts, briefs, or an agent handed stale context,
 * and the site ends up describing one product under two names, which is a
 * direct Trust problem in Google's E-E-A-T terms.
 *
 * SCOPE MATTERS, and is the reason this is a curated list rather than a repo
 * scan. The retired name legitimately survives in:
 *   - `CHANGELOG.md`, which records what was true at the time and must not be
 *     rewritten to say something that was not,
 *   - `designs/` and `stitch_assets/`, which are frozen design artifacts.
 * Banning it repo-wide would fail the build over accurate history.
 */
const LIVE_CONTENT = [
    'messages/en.json',
    'messages/es.json',
    'public/llms.txt',
];

/** Retired name -> the name that replaced it. */
const RETIRED_NAMES: ReadonlyArray<readonly [RegExp, string]> = [
    [/AI Voice Assistants?/gi, 'AI Voice Receptionist'],
    [/Asistente de Voz(?: IA)?/gi, 'Recepcionista de Voz IA'],
    // The same product was called "Website Building" on the home page and
    // "Website Development" on its own service page, in both locales. One
    // offering under two names is a Trust problem in Google's terms, and the
    // route slug already settled which name wins: `services/website-development`.
    [/Website Building/gi, 'Website Development'],
    [/Construcci[oó]n (?:Web|de Sitios Web)/gi, 'Desarrollo Web'],
];

const readRepoFile = (relative: string) =>
    readFileSync(path.resolve(__dirname, '../..', relative), 'utf-8');

describe('retired product names never reach live content', () => {
    it.each(LIVE_CONTENT)('%s uses only current product names', (relative) => {
        const contents = readRepoFile(relative);

        const offenders = RETIRED_NAMES.flatMap(([pattern, replacement]) =>
            [...contents.matchAll(pattern)].map(
                (match) => `"${match[0]}" should be "${replacement}"`
            )
        );

        expect(
            [...new Set(offenders)],
            `${relative} still uses a retired product name`
        ).toEqual([]);
    });

    it('states the current name somewhere, so the guard cannot pass on an empty file', () => {
        const catalogue = LIVE_CONTENT.map(readRepoFile).join('\n');
        expect(catalogue).toMatch(/AI Voice Receptionist/);
        expect(catalogue).toMatch(/Recepcionista de Voz IA/);
    });
});
