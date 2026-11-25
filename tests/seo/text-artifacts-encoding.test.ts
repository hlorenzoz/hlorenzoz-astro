import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';

/**
 * `/llms.txt` and `/robots.txt` are plain-text crawl-surface files, so nothing
 * inside them declares their encoding the way an HTML `<meta charset>` does.
 * That makes them the two artifacts where a missing `charset` on the response
 * is actually visible.
 *
 * It shipped exactly that: `public/llms.txt` is valid UTF-8 (a euro sign is
 * the correct bytes E2 82 AC) but was served as bare `Content-Type:
 * text/plain`. With no charset, browsers fall back to windows-1252 and render
 * those correct bytes as mojibake, so a prospect reading the file saw a run of
 * garbage characters where the price belonged.
 *
 * The lesson these tests encode: when text renders wrong, the bytes and the
 * header are two different defects. Test both, so a future fix targets the
 * real one instead of "cleaning" a file that was never broken.
 *
 * Every character this file matches on is built from a NUMERIC CODEPOINT, not
 * written literally. Two reasons. The repo bans these characters in source
 * (AGENTS.md: "NEVER insert AI typographic characters into ANY file", which
 * names tests explicitly). And several are invisible or ambiguous on screen: a
 * literal U+00A0 key cannot be told apart from a normal space, and if it ever
 * degraded into one, `includes` would match every text file and fail this
 * suite forever against a file that is perfectly fine.
 */
const repoPath = (relative: string) => path.resolve(__dirname, '../..', relative);
const readRepoFile = (relative: string) => readFileSync(repoPath(relative), 'utf-8');

const LLMS_TXT = readRepoFile('public/llms.txt');
const HEADERS = readRepoFile('public/_headers');

const char = (codePoint: number) => String.fromCodePoint(codePoint);

/**
 * Typographic characters banned repo-wide by AGENTS.md, as [codepoint, name].
 * Currency symbols and Spanish accents are deliberately absent: they are
 * legitimate content, not AI tells.
 */
const AI_TELL_CHARS: ReadonlyArray<readonly [number, string]> = [
    [0x2014, 'em dash'],
    [0x2013, 'en dash'],
    [0x2018, 'curly single open quote'],
    [0x2019, 'curly single close quote'],
    [0x201c, 'curly double open quote'],
    [0x201d, 'curly double close quote'],
    [0x2026, 'ellipsis'],
    [0x00a0, 'non-breaking space'],
];

/**
 * Signatures of UTF-8 bytes that were decoded as Latin-1 and re-encoded, which
 * is real file corruption rather than a rendering artifact. First branch: a
 * lead byte (U+00C3 or U+00C2) followed by a Latin-1 continuation in
 * U+0080-U+00BF. Then the euro and em dash sequences specifically.
 */
const MOJIBAKE = new RegExp(
    [
        `[${char(0x00c3)}${char(0x00c2)}][${char(0x0080)}-${char(0x00bf)}]`,
        `${char(0x00e2)}${char(0x201a)}${char(0x00ac)}`,
        `${char(0x00e2)}${char(0x20ac)}`,
    ].join('|')
);

/** The Cloudflare `_headers` paths that must pin a charset. */
const PLAIN_TEXT_ARTIFACTS = ['/llms.txt', '/robots.txt'];

/** Reads the `_headers` block for one path, so a charset belonging to a
 *  different file cannot satisfy the assertion. */
const headerBlockIn = (headersFile: string, routePath: string): string =>
    headersFile.split(/\n(?=\S)/).find((block) => block.startsWith(`${routePath}\n`)) ?? '';

describe('llms.txt: typography', () => {
    it('contains no AI-tell typographic characters', () => {
        const found = AI_TELL_CHARS.filter(([codePoint]) =>
            LLMS_TXT.includes(char(codePoint))
        ).map(
            ([codePoint, name]) =>
                `${name} (${LLMS_TXT.split(char(codePoint)).length - 1}x)`
        );

        expect(
            found,
            `public/llms.txt must be plain ASCII punctuation, found: ${found.join(', ')}`
        ).toEqual([]);
    });

    it('is valid UTF-8 with no double-encoded mojibake', () => {
        const match = LLMS_TXT.match(MOJIBAKE);
        expect(
            match,
            `public/llms.txt looks double-encoded near "${match?.[0]}". The file itself is corrupt; do not fix this in a header.`
        ).toBeNull();
    });
});

describe('_headers: plain-text artifacts declare their charset', () => {
    it.each(PLAIN_TEXT_ARTIFACTS)(
        '%s is served as text/plain with charset=utf-8',
        (routePath) => {
            const block = headerBlockIn(HEADERS, routePath);
            expect(block, `public/_headers has no block for ${routePath}`).not.toBe('');
            expect(
                block,
                `${routePath} must declare charset=utf-8 or browsers fall back to windows-1252 and mojibake valid UTF-8`
            ).toMatch(/Content-Type:\s*text\/plain;\s*charset=utf-8/i);
        }
    );
});

/**
 * The defect this suite exists to prevent lived in the SERVED response, not in
 * the source, so asserting only against `public/` would leave it free to
 * regress: if the build ever stopped copying `public/_headers`, every
 * assertion above would still pass while production reverted to bare
 * `text/plain`.
 *
 * These run only against a build that is at least as new as the sources they
 * mirror, and are reported as SKIPPED otherwise. A visible skip is honest
 * about what was not checked; a silent pass is not.
 *
 * The freshness gate is what makes the guard usable. Comparing unconditionally
 * turned the ordinary edit-then-commit flow into a failure: pre-commit runs
 * `bun run test` and never builds, so editing `public/llms.txt` left `dist/`
 * behind and blocked the commit until a full static export had been run. A
 * stale build is not a defect, it is an absence of evidence, so it is skipped
 * rather than reported as drift.
 */
const BUILT_ARTIFACTS = ['_headers', 'llms.txt'];

const isBuiltFresh = (file: string): boolean => {
    const built = repoPath(`dist/${file}`);
    const source = repoPath(`public/${file}`);
    if (!existsSync(built) || !existsSync(source)) return false;
    // Astro copies public/ into dist/ keeping the source mtime, truncated to
    // whole milliseconds, so compare at that precision: an edit after the build
    // still makes the source strictly newer.
    return Math.floor(statSync(built).mtimeMs) >= Math.floor(statSync(source).mtimeMs);
};

const hasFreshBuild = BUILT_ARTIFACTS.every(isBuiltFresh);

describe.skipIf(!hasFreshBuild)('dist/: the build ships what public/ declares', () => { // guardrail: allow-skip needs a fresh build in dist/
    it.each(BUILT_ARTIFACTS)('dist/%s is byte-identical to its public/ source', (file) => {
        expect(
            readRepoFile(`dist/${file}`),
            `dist/${file} drifted from public/${file}; the deployed artifact is not what the tests above validated`
        ).toBe(readRepoFile(`public/${file}`));
    });

    it.each(PLAIN_TEXT_ARTIFACTS)('built _headers still pins charset for %s', (routePath) => {
        const block = headerBlockIn(readRepoFile('dist/_headers'), routePath);
        expect(block, `dist/_headers has no block for ${routePath}`).not.toBe('');
        expect(block).toMatch(/Content-Type:\s*text\/plain;\s*charset=utf-8/i);
    });
});
