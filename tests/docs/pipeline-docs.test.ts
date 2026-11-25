/**
 * The agent and the slash command are two halves of one pipeline, and the
 * command's own header says to follow it inline when the agent is unavailable.
 * So a correction applied to one file and not the other does not merely go
 * stale, it keeps governing half the execution paths.
 *
 * That happened: the E-E-A-T contract was verified against Google's Search
 * Quality Rater Guidelines and corrected in the agent, while the command kept
 * defining Authoritativeness as "at least one outbound citation to a primary
 * source" - the definition the PDF shows is backwards.
 *
 * These assertions are deliberately about substance, not wording. They check
 * the claims that were actually wrong, plus the API symbols the instructions
 * tell an agent to use, which is the other way these files rot.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { MAX_AUTHORED_TITLE } from '@/lib/service-page';
import { SITE_NAME } from '@/lib/site-config';

const ROOT = process.cwd();
/** Repo-relative read, for this project's own source. */
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
/** Absolute read, for the globally installed pipeline docs. */
const readDoc = (abs: string) => readFileSync(abs, 'utf8');

/** Concatenated source of every .ts/.tsx/.astro under the given directories. */
function sourceTexts(dirs: string[]): string {
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) walk(full);
            else if (/\.(tsx?|astro)$/.test(entry)) out.push(readFileSync(full, 'utf8'));
        }
    };
    for (const dir of dirs) walk(join(ROOT, dir));
    return out.join('\n');
}

/*
 * The docs moved OUT of this repo, into the global install shared by every
 * client project (`~/.claude/agents/`, `~/.claude/commands/`), so these paths
 * are absolute and leave the repository.
 *
 * That is unusual for a test, and the alternative was worse. The coupling these
 * assertions guard did not disappear with the move: the agent still tells its
 * reader to edit `STATIC_ROUTES` in `lib/routes.ts` and still states a 42
 * character title budget, both of which are facts about THIS codebase living in
 * a file that now also governs other projects. A doc that drifts from
 * `MAX_AUTHORED_TITLE` produces over-long titles here regardless of which
 * directory it is stored in, so deleting the guard would trade a real check for
 * a tidier file list.
 *
 * They SKIP rather than fail when the docs are absent. On the machine that owns
 * the global install they run on every commit and bite; on CI or a fresh clone
 * the files genuinely are not there, and failing would only teach the next
 * person to delete the suite. A skip with a reason is the honest report.
 */
const GLOBAL = homedir();
const AGENT = join(GLOBAL, '.claude/agents/local-content-writer.md');
const COMMAND = join(GLOBAL, '.claude/commands/local-seo/create-supporting-content.md');
const PIPELINE_DOCS = [AGENT, COMMAND];
const DOCS_INSTALLED = PIPELINE_DOCS.every(existsSync);

describe.skipIf(!DOCS_INSTALLED)('pipeline docs agree with the official E-E-A-T guidelines', () => { // guardrail: allow-skip the docs are installed globally, absent on a fresh clone
    /**
     * The paragraph that defines Authoritativeness, from its heading to the
     * next blank line, bullet or bold heading.
     *
     * Scoped to the definition rather than the whole file so the check is about
     * the claim itself: both files legitimately discuss outbound citation
     * further down (the agent records the past mistake, the command explains
     * that citing counts toward Trust), and an earlier draft flagged that
     * correct prose. Scoped to the PARAGRAPH rather than the first sentence
     * because a sentence split truncated "being e.g. a go-to source" at the
     * abbreviation and failed a correct definition. A guard that cries wolf
     * gets deleted by the next person it annoys.
     */
    function authoritativenessDefinition(src: string): string {
        const start = src.search(/\*\*Authoritativeness\*\*/);
        expect(start, 'no Authoritativeness definition found').toBeGreaterThan(-1);
        const rest = src.slice(start);

        // Stop at the paragraph or list-item boundary, NOT at the first period.
        // Sentence-splitting truncated a correct definition containing "e.g."
        // to "**Authoritativeness** - being e.g." and failed it, which is the
        // second time a draft of this guard flagged good prose. Paragraph
        // scoping keeps it about the definition without splitting on
        // abbreviations.
        const end = rest.slice(2).search(/\n\s*\n|\n\s*[-*]\s|\n\*\*/);
        return end === -1 ? rest : rest.slice(0, end + 2);
    }

    it.each(PIPELINE_DOCS)('%s defines Authoritativeness as being a go-to source', (file) => {
        // Google 3.4: "the extent to which the content creator or the website is
        // known as a go-to source for the topic". Citing an authority does not
        // make you one, so this is the whole invariant: the DEFINITION names
        // being the source. Anything defining it via outbound linking cannot
        // also satisfy this.
        expect(
            authoritativenessDefinition(readDoc(file)),
            `${file}: Authoritativeness must be defined as being a go-to source for the topic`
        ).toMatch(/go-to source/i);
    });

    it.each(PIPELINE_DOCS)('%s puts Trust at the centre, not as one of four equals', (file) => {
        const src = readDoc(file);
        // "If a page is untrustworthy for any reason, it has low E-E-A-T."
        expect(src, `${file} still frames E-E-A-T as four equal boxes`)
            .not.toMatch(/carries all four|All four E-E-A-T/i);
        expect(src).toMatch(/support (your assessment of )?Trust/i);
    });

    it.each(PIPELINE_DOCS)('%s points at the official PDF as the canonical source', (file) => {
        expect(readDoc(file)).toContain('searchqualityevaluatorguidelines.pdf');
    });

    it.each(PIPELINE_DOCS)('%s does not treat missing reputation as a negative signal', (file) => {
        // Google 3.3.5 / 7.2: small local businesses often have little
        // reputation information and a page can still be rated High without it.
        expect(readDoc(file)).toMatch(/not indicative of high or low quality|Never block a page for lacking/i);
    });
});

describe('pipeline docs reference API symbols that exist', () => {
    const routes = read('lib/routes.ts');

    /*
     * Repo-internal, so it runs everywhere: it reads only this project's source.
     * Kept OUTSIDE the skip below deliberately. These are the symbols the docs
     * send an agent to edit, and if the registry stops exporting them the docs
     * are wrong whether or not the docs happen to be installed on this machine.
     */
    it('the registry symbols the docs tell an agent to edit are really there', () => {
        for (const symbol of ['STATIC_ROUTES', 'parent', 'labelKey', 'lastModified']) {
            expect(routes, `lib/routes.ts has no ${symbol}`).toContain(symbol);
        }
    });

    it('the budget leaves room for the suffix the factory appends', () => {
        expect(MAX_AUTHORED_TITLE + ` | ${SITE_NAME}`.length).toBe(60);
    });
});

describe.skipIf(!DOCS_INSTALLED)('pipeline docs match this codebase', () => { // guardrail: allow-skip the docs are installed globally, absent on a fresh clone
    it.each(PIPELINE_DOCS)('%s names no removed registry export', (file) => {
        const src = readDoc(file);
        // `SITE_ROUTES` was renamed to a private `STATIC_ROUTES`; instructions
        // pointing at the old name send an agent looking for nothing.
        expect(src).not.toMatch(/\bSITE_ROUTES\b/);
    });

    it('every code identifier the docs name exists somewhere in the codebase', () => {
        // Genuinely derived. The previous version claimed to extract symbols
        // from the docs while matching a hardcoded alternation
        // (`contentPage\w+|defineContentPage|assertValidContentPage`) - that
        // alternation WAS the hardcoded list, so a doc naming any other symbol
        // went unchecked, which is exactly the drift this exists to catch.
        //
        // Now: every backticked multi-word identifier in the docs must appear
        // somewhere under lib/ or src/. Multi-word (camelCase or
        // PascalCase) is the filter that keeps prose words like `tier` out
        // while catching `contentPageMetadata` after a rename.
        const sources = sourceTexts(['lib', 'src']);
        const identifiers = new Set(
            PIPELINE_DOCS.flatMap((file) =>
                [...readDoc(file).matchAll(/`([a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*|[A-Z][a-z]+[A-Z][a-zA-Z0-9]*)`/g)]
                    .map((m) => m[1])
            )
        );

        expect(identifiers.size, 'the docs name no code identifier at all').toBeGreaterThan(3);
        const missing = [...identifiers].filter((id) => !sources.includes(id));
        expect(
            missing,
            `docs name identifiers that exist nowhere in the codebase: ${missing.join(', ')}`
        ).toEqual([]);
    });

    it('the title budget the agent states matches the code', () => {
        // Compares the documented number against the IMPORTED constant, not
        // against a hardcoded 42 or the literal text of its definition. The
        // previous version string-matched the source line, so a harmless
        // refactor broke it while a real drift (renaming SITE_NAME to something
        // longer) left doc and test agreeing with each other and disagreeing
        // with the code.
        const budget = /(\d+) characters or fewer/.exec(readDoc(AGENT))?.[1];
        expect(budget, 'the agent no longer states a title budget').toBeDefined();
        expect(Number(budget)).toBe(MAX_AUTHORED_TITLE);
    });
});
