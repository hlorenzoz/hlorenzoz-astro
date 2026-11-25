#!/usr/bin/env node
/**
 * R2 → R2 portfolio image path migration (production-safe, gated).
 *
 * Reorganises portfolio images under a consistent `portfolio/<tenant>/` key prefix
 * in the Cloudflare R2 bucket behind cdn.hlorenzoz.com. The source of truth is
 * `lib/portfolio-data.json`: every CDN URL referenced there whose key matches a
 * known legacy prefix (PREFIX_MAP) is migrated to its new prefix.
 *
 * The old project sources are NOT in the repo (only on R2), so migration is a pure
 * object copy: `wrangler r2 object get` to a temp file, then `put` to the new key.
 * wrangler 4.x has no server-side copy and cannot list a bucket, so we only ever act
 * on keys we can derive from the code.
 *
 * Modes (production order: dry-run → --execute → deploy → --delete):
 *   (default)    dry-run: print the full old→new plan and counts. Touches nothing.
 *   --execute    copy each old key to its new key, verify the new URL serves 200,
 *                and record the pair in the manifest. Old keys stay live.
 *   --delete     read the manifest, re-verify each new URL is 200, then delete the
 *                old key. Run this LAST, after the new paths are deployed & verified.
 *
 * Usage:  node scripts/migrate-cdn-paths.mjs [--execute | --delete]
 *         (bucket defaults to R2_BUCKET env or "images")
 */
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { tmpdir } from 'node:os';

const CDN_BASE = 'https://cdn.hlorenzoz.com/';
const BUCKET = process.env.R2_BUCKET || 'images';
const DATA_PATH = 'lib/portfolio-data.json';
const MAPPINGS_PATH = 'assets/mappings.json';
const MANIFEST_PATH = 'scripts/.cdn-migration-manifest.json';

// Root brand objects (not referenced via portfolio-data.json) → consolidated under hlorenzoz.com/.
const ROOT_ASSETS = ['og-image.webp', 'ai-benefits.webp', 'ai-benefits.png', 'hector-profile.webp', 'hector-profile.png'];
const ROOT_PREFIX = 'hlorenzoz.com/';

// Ordered legacy → new key-prefix rewrites. First match wins.
const PREFIX_MAP = [
  { from: 'portfolio/', to: 'hlorenzoz.com/portfolio/' },
];

const CONTENT_TYPES = {
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

/** Recursively collect every string value in a parsed JSON structure. */
function collectStrings(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) for (const v of node) collectStrings(v, out);
  else if (node && typeof node === 'object') for (const v of Object.values(node)) collectStrings(v, out);
  return out;
}

/** Compute the new key for an old key, or null if no rule applies. */
function rewriteKey(oldKey) {
  const rule = PREFIX_MAP.find((r) => oldKey.startsWith(r.from));
  if (rule) return rule.to + oldKey.slice(rule.from.length);
  if (ROOT_ASSETS.includes(oldKey)) return ROOT_PREFIX + oldKey;
  return null;
}

function contentTypeFor(key) {
  const ext = extname(key).toLowerCase();
  const ct = CONTENT_TYPES[ext];
  if (!ct) throw new Error(`Unknown content-type for extension "${ext}" (key ${key})`);
  return ct;
}

/**
 * Build the dedup'd migration plan from three sources:
 *  a. CDN URLs referenced in lib/portfolio-data.json (me / real-estate / dental / meg webp + jpg)
 *  b. formats URLs in assets/mappings.json (meg's full set incl. avif + unreferenced images)
 *  c. the explicit ROOT_ASSETS brand objects
 */
function buildPlan() {
  const candidates = [];
  const fromData = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  candidates.push(...collectStrings(fromData));
  if (existsSync(MAPPINGS_PATH)) {
    const fromLedger = JSON.parse(readFileSync(MAPPINGS_PATH, 'utf8'));
    candidates.push(...collectStrings(fromLedger));
  }
  const oldKeys = candidates.filter((s) => s.startsWith(CDN_BASE)).map((s) => s.slice(CDN_BASE.length));
  oldKeys.push(...ROOT_ASSETS);

  const byOldKey = new Map();
  for (const oldKey of oldKeys) {
    const newKey = rewriteKey(oldKey);
    if (!newKey) continue; // already under hlorenzoz.com/ or out of scope
    byOldKey.set(oldKey, { oldKey, newKey, contentType: contentTypeFor(oldKey) });
  }
  return [...byOldKey.values()];
}

/** HTTP status for a CDN key (HEAD). Returns a number, 0 on network failure. */
function headStatus(key) {
  try {
    const out = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-I', `${CDN_BASE}${key}`], {
      encoding: 'utf8',
    });
    return parseInt(out.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function r2Get(key, filePath) {
  execFileSync('bun', ['x', 'wrangler', 'r2', 'object', 'get', `${BUCKET}/${key}`, '--file', filePath, '--remote'], {
    stdio: 'inherit',
  });
}

function r2Put(key, filePath, contentType) {
  execFileSync(
    'bun',
    ['x', 'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', filePath, '--content-type', contentType, '--remote'],
    { stdio: 'inherit' }
  );
}

function r2Delete(key) {
  execFileSync('bun', ['x', 'wrangler', 'r2', 'object', 'delete', `${BUCKET}/${key}`, '--remote'], { stdio: 'inherit' });
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return [];
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function writeManifest(entries) {
  writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2) + '\n');
}

function printPlan(plan) {
  const byPrefix = {};
  for (const entry of plan) {
    const slash = entry.newKey.lastIndexOf('/');
    const group = slash === -1 ? '(root)' : entry.newKey.slice(0, slash) + '/';
    (byPrefix[group] ??= []).push(entry);
  }
  for (const [prefix, items] of Object.entries(byPrefix)) {
    console.log(`\n  → ${prefix}  (${items.length})`);
    for (const { oldKey, newKey, contentType } of items) {
      console.log(`     ${oldKey}\n       ↳ ${newKey}  [${contentType}]`);
    }
  }
  console.log(`\n  Total unique objects: ${plan.length}`);
}

async function main() {
  const mode = process.argv.includes('--execute')
    ? 'execute'
    : process.argv.includes('--delete')
      ? 'delete'
      : 'dry-run';

  const plan = buildPlan();

  if (mode === 'dry-run') {
    console.log(`🔎 DRY RUN — bucket "${BUCKET}". No changes will be made.`);
    printPlan(plan);
    console.log('\nNext: re-read this script, then run with --execute to copy.');
    return;
  }

  if (mode === 'execute') {
    console.log(`🚚 EXECUTE — copying ${plan.length} object(s) → bucket "${BUCKET}"`);
    const tmp = mkdtempSync(join(tmpdir(), 'cdn-migrate-'));
    const manifest = readManifest();
    const done = new Set(manifest.map((e) => e.oldKey));
    let ok = 0;
    let failed = 0;
    try {
      for (const { oldKey, newKey, contentType } of plan) {
        try {
          if (headStatus(newKey) === 200) {
            console.log(`   ⏭  ${newKey} already present (200) — skipping`);
            if (!done.has(oldKey)) {
              manifest.push({ oldKey, newKey, contentType });
              done.add(oldKey);
              writeManifest(manifest);
            }
            ok += 1;
            continue;
          }
          const filePath = join(tmp, basename(oldKey));
          r2Get(oldKey, filePath);
          r2Put(newKey, filePath, contentType);
          const status = headStatus(newKey);
          if (status !== 200) throw new Error(`new key verify failed (HTTP ${status})`);
          if (!done.has(oldKey)) {
            manifest.push({ oldKey, newKey, contentType });
            done.add(oldKey);
            writeManifest(manifest); // crash-safe: persist after each success
          }
          ok += 1;
          console.log(`   ✓ ${oldKey} → ${newKey}`);
        } catch (err) {
          failed += 1;
          console.error(`   ✗ ${oldKey} failed: ${err.message}`);
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    console.log(`\n✅ Copied ${ok}/${plan.length} (${failed} failed). Manifest: ${MANIFEST_PATH}`);
    console.log('Next: update lib/portfolio-data.json, build, deploy, verify, THEN run --delete.');
    if (failed > 0) process.exitCode = 1;
    return;
  }

  if (mode === 'delete') {
    const manifest = readManifest();
    if (manifest.length === 0) {
      console.log('No manifest entries — nothing to delete. Run --execute first.');
      return;
    }
    console.log(`🗑  DELETE — removing ${manifest.length} old key(s) from bucket "${BUCKET}"`);
    let ok = 0;
    let skipped = 0;
    for (const { oldKey, newKey } of manifest) {
      const status = headStatus(newKey);
      if (status !== 200) {
        skipped += 1;
        console.error(`   ⏭  ${oldKey} kept — new key ${newKey} is not 200 (HTTP ${status})`);
        continue;
      }
      try {
        r2Delete(oldKey);
        ok += 1;
        console.log(`   ✓ deleted ${oldKey}`);
      } catch (err) {
        console.error(`   ✗ ${oldKey} delete failed: ${err.message}`);
      }
    }
    console.log(`\n✅ Deleted ${ok}/${manifest.length} (${skipped} kept for safety).`);
    return;
  }
}

main();
