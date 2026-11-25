// Static data provider for the localized news export, mirroring lib/actions/portfolio.ts.

import { getNewsItems, getNewsItemBySlug, type NewsItem } from '@/lib/news';

export async function getNewsItemsAction(): Promise<NewsItem[]> {
    try {
        return getNewsItems();
    } catch (error) {
        console.error('Failed to fetch news items:', error);
        return [];
    }
}

export async function getNewsItemBySlugAction(slug: string): Promise<NewsItem | undefined> {
    try {
        return getNewsItemBySlug(slug);
    } catch (error) {
        console.error(`Failed to fetch news item for slug ${slug}:`, error);
        return undefined;
    }
}
