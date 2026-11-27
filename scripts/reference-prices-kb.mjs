#!/usr/bin/env node
/**
 * Renders `docs/assistant-kb/reference-prices.json` as the Markdown document the ElevenLabs
 * assistant reads from its knowledge base ("Reference prices by business and country").
 *
 * The JSON is the single source: every figure carries its source, date and caveat, and
 * `tests/docs/reference-prices.test.ts` checks it. After editing it, render this document and
 * replace the agent's knowledge base text with it.
 *
 * Usage:  just assistant-kb > reference-prices.md
 */
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
export const DATA_PATH = join(ROOT, 'docs', 'assistant-kb', 'reference-prices.json');

const cell = (value) => String(value ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const amount = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** The knowledge base document: an explanation, then one table per country. */
export function renderReferencePrices(data) {
    const lines = [
        '# Reference prices by business and country',
        '',
        `Typical prices customers pay local businesses in the markets Lorenzoz Agency serves, collected on ${data.collected} from the sources listed in each row.`,
        'Use a figure only to illustrate what a customer is worth when the visitor does not know their own value: say it is a market average from that source and date, not their number, and calculate with calculate_cost_of_waiting in the currency shown.',
        'These are prices of client industries, never the agency\'s prices. A business or country not listed here has no reference: ask the visitor for a figure instead of guessing.',
        '',
    ];
    for (const country of data.countries) {
        const rows = country.rows.filter((row) => !row.missing);
        lines.push(`## ${country.country_name} (${country.country}), prices in ${country.currency}`, '');
        lines.push('| Business | Typical price | Range | Unit | Source | Date | Notes |', '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
        for (const row of rows) {
            const range = row.low != null && row.high != null ? `${amount(row.low)} to ${amount(row.high)}` : '';
            lines.push(
                `| ${cell(data.businesses[row.key])} | ${amount(row.typical)} ${row.currency} | ${range} | ${row.unit} | ${cell(row.source_title)} (${row.source_url}) | ${row.source_date ?? 'undated'} | ${cell(row.notes)} |`
            );
        }
        const missing = country.rows.filter((row) => row.missing).map((row) => data.businesses[row.key]);
        if (missing.length) lines.push('', `No reliable reference for: ${missing.join(', ')}.`);
        lines.push('');
    }
    return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    process.stdout.write(renderReferencePrices(JSON.parse(readFileSync(DATA_PATH, 'utf8'))));
}
