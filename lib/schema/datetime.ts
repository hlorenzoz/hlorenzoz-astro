import { parseFreshnessDate } from '@/lib/routing';

/**
 * Dates as structured data and OpenGraph emit them.
 *
 * Content dates are stored as bare `YYYY-MM-DD` (routes, data files, sitemap,
 * bylines). Google's Rich Results Test flags a bare date in `datePublished` /
 * `dateModified` as "Invalid datetime value" and "missing a time zone", so every
 * emitted date is widened here to a full ISO 8601 datetime: local midnight in
 * the agency's zone, with that day's real UTC offset (DST aware).
 */
const SITE_TIME_ZONE = 'Europe/Madrid';

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIME_ZONE,
    timeZoneName: 'longOffset',
});

/** Offset of SITE_TIME_ZONE at `instant`, in minutes east of UTC. */
function offsetMinutes(instant: number): number {
    const name = offsetFormatter.formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value ?? '';
    const m = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name);
    if (!m) throw new Error(`Unexpected time zone offset "${name}" for ${SITE_TIME_ZONE}.`);
    if (!m[1]) return 0;
    const minutes = Number(m[2]) * 60 + Number(m[3]);
    return m[1] === '-' ? -minutes : minutes;
}

function formatOffset(minutes: number): string {
    const abs = Math.abs(minutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${minutes < 0 ? '-' : '+'}${hh}:${mm}`;
}

/**
 * `2026-11-24` -> `2026-11-24T00:00:00+01:00`. Throws on anything that is not a
 * real `YYYY-MM-DD` calendar date.
 */
export function schemaDateTime(date: string): string {
    const utcMidnight = parseFreshnessDate(date, 'structured data date').getTime();
    // Local midnight is utcMidnight minus the offset in force at that instant;
    // re-reading the offset there makes a DST change near midnight resolve right.
    const guess = offsetMinutes(utcMidnight);
    const offset = offsetMinutes(utcMidnight - guess * 60_000);
    return `${date}T00:00:00${formatOffset(offset)}`;
}

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

/** True only for a full ISO 8601 datetime that carries a time zone. */
export function isSchemaDateTime(value: unknown): boolean {
    return typeof value === 'string' && DATETIME.test(value);
}

const DATE_KEY = /^date[A-Z]|Date$|Time$/;
const ENTITY_KEYS = new Set(['about', 'mentions']);

function isTypedNode(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && '@type' in value;
}

function keyPath(path: string, key: string): string {
    return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}['${key}']`;
}

/**
 * Throws, naming the property path, when a JSON-LD payload carries a date
 * without a time zone or an `about` / `mentions` that is not a typed node.
 * `components/JsonLd.tsx` runs it on every block, so a regression fails the
 * build and every page-rendering test instead of reaching Search Console.
 */
export function assertSchemaInvariants(data: unknown, path = '$'): void {
    if (Array.isArray(data)) {
        data.forEach((item, i) => assertSchemaInvariants(item, `${path}[${i}]`));
        return;
    }
    if (typeof data !== 'object' || data === null) return;

    for (const [key, value] of Object.entries(data)) {
        const here = keyPath(path, key);
        if (DATE_KEY.test(key) && !isSchemaDateTime(value)) {
            throw new Error(
                `JSON-LD ${here} is ${JSON.stringify(value)}: expected an ISO 8601 datetime ` +
                'with a time zone. Pass the date through schemaDateTime().'
            );
        }
        if (ENTITY_KEYS.has(key)) {
            const items = Array.isArray(value) ? value : [value];
            items.forEach((item, i) => {
                if (!isTypedNode(item)) {
                    const at = Array.isArray(value) ? `${here}[${i}]` : here;
                    throw new Error(
                        `JSON-LD ${at} is ${JSON.stringify(item)}: expected an object with @type, ` +
                        'not a bare string (Google reads it as an untyped Thing).'
                    );
                }
            });
        }
        assertSchemaInvariants(value, here);
    }
}
