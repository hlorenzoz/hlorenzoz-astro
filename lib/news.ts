import newsData from './news-data.json';
import { getPortfolioItems } from '@/lib/portfolio';
import { parseFreshnessDate } from '@/lib/routing';

/**
 * One news post. Its copy lives in `messages/{en,es}.json` under
 * `news.items.<id>`; this entry holds only what is shared across locales.
 */
export interface NewsItem {
    id: string;
    slug: string;
    /** ISO date (YYYY-MM-DD). Set once on creation, never bumped. */
    datePublished: string;
    /** ISO date (YYYY-MM-DD) of the last meaningful content change. */
    lastModified: string;
    /** `id` of the portfolio entry the post is about. */
    portfolioId: string;
    /** Cover image (CDN .webp). */
    image: string;
    /** Social share image (CDN .jpeg). Older CDN images have none, so it falls back to `image`. */
    ogImage?: string;
}

/**
 * Throws on any entry that would publish a broken page. Runs at module load,
 * so a bad entry fails the build naming itself instead of shipping.
 */
export function validateNewsItems(items: NewsItem[], portfolioIds: ReadonlySet<string>): NewsItem[] {
    // A dynamic route with no params fails `output: 'export'` with a far less helpful message.
    if (items.length === 0) throw new Error('lib/news-data.json is empty: the news routes need at least one post.');

    const slugs = new Set<string>();
    const ids = new Set<string>();
    for (const item of items) {
        const context = `news item "${item.id}"`;
        if (!portfolioIds.has(item.portfolioId)) {
            throw new Error(`${context} references unknown portfolioId "${item.portfolioId}".`);
        }
        const published = parseFreshnessDate(item.datePublished, `${context} datePublished`);
        const modified = parseFreshnessDate(item.lastModified, `${context} lastModified`);
        if (modified < published) {
            throw new Error(`${context} has a lastModified earlier than its datePublished.`);
        }
        if (slugs.has(item.slug)) throw new Error(`duplicate news slug "${item.slug}"`);
        if (ids.has(item.id)) throw new Error(`duplicate news id "${item.id}"`);
        slugs.add(item.slug);
        ids.add(item.id);
    }
    return items;
}

const NEWS: readonly NewsItem[] = validateNewsItems(
    newsData as NewsItem[],
    new Set(getPortfolioItems().map((item) => item.id))
);

/** All posts, newest first (the JSON is appended in publication order). */
export function getNewsItems(): NewsItem[] {
    return NEWS.slice().reverse();
}

export function getNewsItemBySlug(slug: string): NewsItem | undefined {
    return NEWS.find((item) => item.slug === slug);
}

/** The freshest `lastModified` of any post: the news index changes whenever a post does. */
export function latestNewsModified(): string {
    return NEWS.map((item) => item.lastModified).sort().at(-1)!;
}
