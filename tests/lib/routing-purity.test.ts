/**
 * Guards the boundary between routing primitives and the route registry.
 *
 * `lib/routes.ts` derives routes at module scope by calling into
 * `lib/portfolio-data.json`. A module-scope call is a side effect a bundler
 * cannot prove safe to drop, so anything importing ANY symbol from that module
 * pulls the entire JSON along.
 *
 * That shipped: `components/Navbar.tsx` is a client component present on every
 * route, it imported `localeHref` from the registry, and the built bundle for
 * /en/privacy-policy/ - a page with no portfolio content whatsoever - carried
 * the full portfolio payload including `fullScreenshot` and `slides`. The fix
 * was to move the pure helpers into `lib/routing.ts`. This test keeps them
 * there.
 *
 * Static analysis of the source, deliberately: an assertion against the built
 * artifact would only run after a full build, and this needs to fail fast.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();

function readSource(rel: string): string {
    return readFileSync(join(ROOT, rel), 'utf8');
}

/** Every .ts/.tsx file under the given directories, excluding tests. */
function sourceFiles(dirs: string[]): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            if (statSync(full).isDirectory()) {
                if (entry === 'node_modules' || entry === '.next') continue;
                walk(full);
                continue;
            }
            if (/\.tsx?$/.test(entry)) out.push(relative(ROOT, full));
        }
    };
    for (const dir of dirs) walk(join(ROOT, dir));
    return out;
}

describe('lib/routing.ts stays free of data imports', () => {
    const routing = readSource('lib/routing.ts');

    it('imports nothing at all', () => {
        // The moment this module imports a data module, every client component
        // that uses `localeHref` starts shipping that data again.
        const imports = [...routing.matchAll(/^\s*import\s.+from\s+'([^']+)'/gm)].map((m) => m[1]);
        expect(imports, `lib/routing.ts must stay dependency-free, found: ${imports.join(', ')}`)
            .toEqual([]);
    });

    it('does not reference any data module in its code', () => {
        // Comments are stripped first: the docblock explains the portfolio
        // regression by name, and prose describing a hazard is not the hazard.
        const code = routing
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');
        for (const marker of ['portfolio', 'messages/', '.json']) {
            expect(code, `lib/routing.ts code references "${marker}"`).not.toContain(marker);
        }
    });

    it('exports the helpers a client component needs', () => {
        for (const symbol of ['localeHref', 'tryParseFreshnessDate', 'SECTION_TIERS']) {
            expect(routing, `lib/routing.ts should export ${symbol}`)
                .toMatch(new RegExp(`export (function|const) ${symbol}\\b`));
        }
    });
});

/**
 * Every local module a file imports, as repo-relative paths where resolvable.
 *
 * Matches three forms, because a module is bundled regardless of which is used:
 *   import x from 'y'      (and every named/namespace variant)
 *   import 'y'             side-effect only, NO `from` clause
 *   await import('y')      dynamic
 *
 * The first version of this matched only the `from` clause, so
 * `import '@/lib/routes';` was invisible to a guard whose entire job is
 * catching that module reaching a client bundle.
 */
function extractSpecifiers(src: string): string[] {
    return [
        ...[...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
        ...[...src.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]),
        ...[...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
    ];
}

function localImports(file: string): string[] {
    return extractSpecifiers(readSource(file))
        .filter((spec) => spec.startsWith('@/') || spec.startsWith('.'))
        .map((spec) =>
            spec.startsWith('@/')
                ? spec.slice(2)
                : relative(ROOT, join(ROOT, dirname(file), spec))
        );
}

/** Resolves a repo-relative module path to an actual source file, if any. */
function resolveSource(modulePath: string): string | null {
    for (const candidate of [
        `${modulePath}.ts`,
        `${modulePath}.tsx`,
        join(modulePath, 'index.ts'),
        join(modulePath, 'index.tsx'),
    ]) {
        try {
            statSync(join(ROOT, candidate));
            return candidate;
        } catch {
            // Not this extension; try the next.
        }
    }
    return null;
}

/**
 * Walks the local import graph from `entry`, returning every reachable source
 * file. Resolving the real graph rather than grepping for a literal string is
 * what closes two escapes the first version of this guard had: a relative
 * specifier (`'../lib/routes'`) and a transitive import through a helper.
 */
function reachableModules(entry: string): Set<string> {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
        const current = queue.pop();
        if (!current || seen.has(current)) continue;
        seen.add(current);
        for (const dep of localImports(current)) {
            const resolved = resolveSource(dep);
            if (resolved && !seen.has(resolved)) queue.push(resolved);
        }
    }
    return seen;
}

describe('the import extractor sees every form that bundles a module', () => {
    it.each([
        ["import { a } from '@/lib/routes';", 'named'],
        ["import a from '@/lib/routes';", 'default'],
        ["import * as a from '@/lib/routes';", 'namespace'],
        ["import '@/lib/routes';", 'side-effect, no from clause'],
        ["const a = await import('@/lib/routes');", 'dynamic'],
        ["import type { A } from '@/lib/routes';", 'type-only'],
    ])('detects %s (%s)', (source) => {
        // A side-effect import bundles the module exactly like a named one.
        // Matching only the `from` clause missed it entirely, which is how the
        // third escape in this guard survived two rounds of review.
        expect(extractSpecifiers(source)).toContain('@/lib/routes');
    });

    it('picks up several imports from one file', () => {
        const src = [
            "import { a } from './x';",
            "import '@/lib/routes';",
            "import b from 'react';",
        ].join('\n');
        expect(extractSpecifiers(src)).toEqual(
            expect.arrayContaining(['./x', '@/lib/routes', 'react'])
        );
    });
});

describe('no client component can reach the route registry', () => {
    const clientFiles = sourceFiles(['components', 'app']).filter((file) =>
        /^\s*['"]use client['"]/m.test(readSource(file))
    );

    it('finds the client components to check', () => {
        // Guards the guard: a broken walk would make every assertion vacuous.
        expect(clientFiles.length).toBeGreaterThan(3);
    });

    it.each(clientFiles)('%s cannot reach lib/routes, directly or transitively', (file) => {
        const reachable = reachableModules(file);
        expect(
            [...reachable].filter((m) => m === 'lib/routes.ts'),
            `${file} reaches the route registry, which pulls portfolio-data.json ` +
            `into the client bundle. Import primitives from @/lib/routing instead. ` +
            `Path: ${[...reachable].join(' -> ')}`
        ).toEqual([]);
    });

    it('specifically keeps the sitewide Navbar off the registry', () => {
        // The Navbar renders on every route, so it is the worst possible place
        // to leak a data module from. This is where the regression happened.
        expect([...reachableModules('components/Navbar.tsx')]).not.toContain('lib/routes.ts');
        expect(readSource('components/Navbar.tsx')).toMatch(/from\s+'@\/lib\/routing'/);
    });

    it('detects a registry import written with a relative specifier', () => {
        // The literal-string version of this guard matched only '@/lib/routes',
        // so '../lib/routes' walked straight past it.
        const graph = reachableModules('app/sitemap.ts');
        expect([...graph]).toContain('lib/routes.ts');
    });
});

describe('the registry does not re-export the pure primitives', () => {
    const registry = readSource('lib/routes.ts');

    it.each(['localeHref', 'parseFreshnessDate', 'tryParseFreshnessDate'])(
        'does not re-export %s',
        (symbol) => {
            // A re-export makes `import { localeHref } from '@/lib/routes'`
            // compile, which is the exact import that leaked 24K of portfolio
            // JSON sitewide. Keeping the surfaces disjoint makes the wrong
            // import fail to resolve rather than merely being discouraged.
            const reExport = new RegExp(`export\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from`, 's');
            expect(registry, `lib/routes.ts re-exports ${symbol}; delete it`)
                .not.toMatch(reExport);
        }
    );
});
