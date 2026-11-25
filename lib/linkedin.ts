import linkedinData from './linkedin-articles.json';

export interface LinkedInArticle {
    id: string;
    /** Canonical URL of the published LinkedIn article. */
    url: string;
    /** Cover image URL (hosted on the CDN or /public — never a signed licdn URL). */
    image: string;
    title: string;
    excerpt: string;
    /** ISO date (YYYY-MM-DD) of publication. */
    date: string;
    /** Estimated reading time in minutes. */
    readTimeMin: number;
}

/**
 * Retrieves all LinkedIn articles, ordered newest-first (LIFO),
 * mirroring the portfolio accessor. slice() copies so the imported
 * JSON array is never mutated.
 */
export function getLinkedInArticles(): LinkedInArticle[] {
    return (linkedinData as LinkedInArticle[]).slice().reverse();
}
