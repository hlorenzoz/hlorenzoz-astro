/**
 * Official sites of the technologies the articles talk about, and the linker
 * that turns their first mention on a page into a followed external link.
 *
 * One link per site per page: once a host is linked, later mentions (and other
 * names that point to the same host, e.g. "Tailwind" after "Tailwind CSS",
 * Turnstile after Cloudflare) stay plain text. Longer names are listed first so
 * "SvelteKit" wins over "Svelte" and "Tailwind CSS" over "Tailwind".
 */
export const TECH_LINKS: readonly { name: string; url: string }[] = [
    { name: 'Next.js', url: 'https://nextjs.org/' },
    { name: 'Astro', url: 'https://astro.build/' },
    { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
    { name: 'Tailwind', url: 'https://tailwindcss.com/' },
    { name: 'Cloudflare', url: 'https://www.cloudflare.com/' },
    { name: 'Turnstile', url: 'https://www.cloudflare.com/products/turnstile/' },
    { name: 'Vitest', url: 'https://vitest.dev/' },
    { name: 'Playwright', url: 'https://playwright.dev/' },
    { name: 'PageSpeed Insights', url: 'https://pagespeed.web.dev/' },
    { name: 'Lighthouse', url: 'https://developer.chrome.com/docs/lighthouse/overview' },
    { name: 'Workbox', url: 'https://developer.chrome.com/docs/workbox' },
    { name: 'Rich Results Test', url: 'https://search.google.com/test/rich-results' },
    { name: 'SvelteKit', url: 'https://svelte.dev/docs/kit/introduction' },
    { name: 'Svelte', url: 'https://svelte.dev/' },
    { name: 'React', url: 'https://react.dev/' },
    { name: 'ElevenLabs', url: 'https://elevenlabs.io/' },
    { name: 'WordPress', url: 'https://wordpress.org/' },
    { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
    { name: 'GitHub Actions', url: 'https://github.com/features/actions' },
    { name: 'ESLint', url: 'https://eslint.org/' },
    { name: 'Bun', url: 'https://bun.sh/' },
    { name: 'JSON-LD', url: 'https://json-ld.org/' },
    { name: 'schema.org', url: 'https://schema.org/' },
];

export type LinkedSegment = string | { text: string; href: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest names first, whole words only (no letter, digit or dot glued to either side).
const PATTERN = new RegExp(
    `(?<![\\w.])(${[...TECH_LINKS].sort((a, b) => b.name.length - a.name.length).map((t) => escape(t.name)).join('|')})(?![\\w])`,
    'g'
);
const URL_BY_NAME = new Map(TECH_LINKS.map((t) => [t.name, t.url]));

/** A linker for one page: call it on each paragraph in reading order. */
export function createTechLinker(): (text: string) => LinkedSegment[] {
    const linkedHosts = new Set<string>();
    return (text) => {
        const out: LinkedSegment[] = [];
        let last = 0;
        for (const match of text.matchAll(PATTERN)) {
            const url = URL_BY_NAME.get(match[1])!;
            const host = new URL(url).host;
            if (linkedHosts.has(host)) continue;
            linkedHosts.add(host);
            const before = text.slice(last, match.index);
            if (before) out.push(before);
            out.push({ text: match[1], href: url });
            last = match.index! + match[1].length;
        }
        const rest = text.slice(last);
        if (rest) out.push(rest);
        return out.length ? out : [text];
    };
}
