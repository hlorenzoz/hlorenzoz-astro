// Static data provider for the localized portfolio (read at build time)

import { getPortfolioItems, getPortfolioItemBySlug, type PortfolioItem } from '@/lib/portfolio';

/**
 * Server Action to fetch all portfolio items.
 * Provides a clean interface for both Server and Client components.
 */
export async function getPortfolioItemsAction(): Promise<PortfolioItem[]> {
  try {
    // In a real database scenario, we would add caching (next: { revalidate: ... }) here.
    return getPortfolioItems();
  } catch (error) {
    console.error('Failed to fetch portfolio items:', error);
    return [];
  }
}

/**
 * Server Action to fetch a single portfolio item by its slug.
 */
export async function getPortfolioItemBySlugAction(slug: string): Promise<PortfolioItem | undefined> {
  try {
    return getPortfolioItemBySlug(slug);
  } catch (error) {
    console.error(`Failed to fetch portfolio item for slug ${slug}:`, error);
    return undefined;
  }
}
