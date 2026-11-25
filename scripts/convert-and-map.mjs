#!/usr/bin/env node
/**
 * Batch image → CDN pipeline (idempotent).
 *
 * Recursively scans `assets/` (skipping `generated/`) for raster sources
 * (.jpg/.jpeg/.png), skips any already recorded in `assets/mappings.json`, converts
 * each new one to WEBP + AVIF + JPEG with sharp, uploads each to the Cloudflare R2 bucket
 * behind cdn.hlorenzoz.com, and records the result.
 *
 * The CDN key mirrors the source's path relative to `assets/`, so namespaced sources
 * map to namespaced CDN keys:
 *   assets/portfolio/meg/cover.png  →  https://cdn.hlorenzoz.com/portfolio/meg/cover.webp
 * Top-level sources keep flat keys (cover.png → cover.webp), preserving older entries.
 *
 * `assets/mappings.json` is the ledger, keyed by the source's relative path: an entry
 * exists only after a successful upload, so re-running processes only what is new
 * ("0 new images" when everything is mapped).
 *
 * Usage:  bun run images:sync           (bucket defaults to R2_BUCKET env or "images")
 */
import process from 'node:process';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname, dirname, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ASSETS_DIR = 'assets';
const GENERATED_DIR = join(ASSETS_DIR, 'generated');
const MAPPINGS_PATH = join(ASSETS_DIR, 'mappings.json');
const CDN_BASE = 'https://cdn.hlorenzoz.com/';
const BUCKET = process.env.R2_BUCKET || 'images';
const SOURCE_EXTS = new Set(['.jpg', '.jpeg', '.png']);

/** Recursively list source files under `dir`, skipping the generated output tree. */
function listSources(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === GENERATED_DIR) continue;
      out.push(...listSources(full));
    } else if (SOURCE_EXTS.has(extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

export const TARGETS = [
  { format: 'webp', contentType: 'image/webp', encode: (img) => img.webp({ quality: 80 }) },
  { format: 'avif', contentType: 'image/avif', encode: (img) => img.avif({ quality: 55 }) },
  // JPEG is the fallback for OpenGraph cards and JSON-LD; flatten so PNG transparency is not rendered black.
  {
    format: 'jpeg',
    contentType: 'image/jpeg',
    encode: (img) => img.flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }),
  },
];

function readMappings() {
  if (!existsSync(MAPPINGS_PATH)) return {};
  return JSON.parse(readFileSync(MAPPINGS_PATH, 'utf8'));
}

function writeMappings(mappings) {
  writeFileSync(MAPPINGS_PATH, JSON.stringify(mappings, null, 2) + '\n');
}

function uploadToR2(key, filePath, contentType) {
  execFileSync(
    'bun',
    ['x', 'wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', filePath, '--content-type', contentType, '--remote'],
    { stdio: 'inherit' }
  );
}

async function main() {
  mkdirSync(GENERATED_DIR, { recursive: true });
  const mappings = readMappings();

  // Ledger keys are the source path relative to assets/, normalised to forward slashes.
  const sources = listSources(ASSETS_DIR)
    .map((src) => ({ src, rel: relative(ASSETS_DIR, src).split(sep).join('/') }))
    .filter(({ rel }) => !mappings[rel]);

  if (sources.length === 0) {
    console.log('✅ 0 new images - mappings.json is up to date.');
    return;
  }

  console.log(`🖼  ${sources.length} new image(s) to process → bucket "${BUCKET}"`);

  let ok = 0;
  for (const { src, rel } of sources) {
    const stem = rel.slice(0, rel.length - extname(rel).length); // e.g. portfolio/meg/cover
    try {
      const formats = {};
      for (const { format, contentType, encode } of TARGETS) {
        const key = `${stem}.${format}`;                  // CDN key mirrors the source subpath
        const outPath = join(GENERATED_DIR, key);
        mkdirSync(dirname(outPath), { recursive: true });
        await encode(sharp(src)).toFile(outPath);
        uploadToR2(key, outPath, contentType);
        formats[format] = `${CDN_BASE}${key}`;
      }
      mappings[rel] = { source: src, r2Bucket: BUCKET, formats };
      writeMappings(mappings); // persist after each success (crash-safe ledger)
      ok += 1;
      console.log(`   ✓ ${rel} → ${stem}.{${TARGETS.map((t) => t.format).join(',')}}`);
    } catch (err) {
      console.error(`   ✗ ${rel} failed: ${err.message}`);
    }
  }

  console.log(`\n✅ Done: ${ok}/${sources.length} processed. Ledger: ${MAPPINGS_PATH}`);
  if (ok < sources.length) process.exitCode = 1;
}

// Run only when executed directly, so tests can import TARGETS without uploading anything.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
