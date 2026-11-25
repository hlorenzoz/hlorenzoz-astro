// Static data provider for Next.js 16+ localized LinkedIn articles export

import { getLinkedInArticles, LinkedInArticle } from '@/lib/linkedin';

/**
 * Server Action to fetch all LinkedIn articles.
 * Provides a clean interface for both Server and Client components.
 */
export async function getLinkedInArticlesAction(): Promise<LinkedInArticle[]> {
  try {
    // In a real database scenario, we would add caching (next: { revalidate: ... }) here.
    return getLinkedInArticles();
  } catch (error) {
    console.error('Failed to fetch LinkedIn articles:', error);
    return [];
  }
}
