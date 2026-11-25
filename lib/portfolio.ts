import portfolioData from './portfolio-data.json';

export interface PortfolioSlide {
    id: string;
    image?: string | string[];
    map?: string;
    title?: string;
    description?: string;
    link?: string;
    badge?: string;
}


export interface PortfolioItem {
    id: string;
    slug: string;
    /**
     * ISO date (YYYY-MM-DD) of the last meaningful content change, mirroring
     * `SiteRoute.lastModified` in `lib/routes.ts`.
     *
     * Required, not optional: the sitemap previously hardcoded a single date
     * for every portfolio URL, so no amount of editing an entry could ever
     * change what /sitemap.xml reported. Making it part of the item forces the
     * date to be updated alongside the content it describes, per the freshness
     * rule in AGENTS.md.
     */
    lastModified: string;
    type: 'live' | 'demo';
    image: string;
    fullScreenshot: string | string[];
    url: string;
    /** External booking/quote URL for live projects. Falls back to the local contact section. */
    bookingUrl?: string;
    slides?: PortfolioSlide[];
}

/**
 * Retrieves all portfolio items, ordered newest-first (LIFO).
 * slice() returns a copy so the imported JSON array is never mutated.
 */
export function getPortfolioItems(): PortfolioItem[] {
    return (portfolioData as PortfolioItem[]).slice().reverse();
}

/**
 * Retrieves a single portfolio item by its slug.
 */
export function getPortfolioItemBySlug(slug: string): PortfolioItem | undefined {
    return (portfolioData as PortfolioItem[]).find(item => item.slug === slug);
}

/** The freshest `lastModified` of any item: the portfolio index changes whenever an item does. */
export function latestPortfolioModified(): string {
    return (portfolioData as PortfolioItem[]).map((item) => item.lastModified).sort().at(-1)!;
}
