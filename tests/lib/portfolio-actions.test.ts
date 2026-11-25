import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPortfolioItemsAction, getPortfolioItemBySlugAction } from '@/lib/actions/portfolio';
import * as portfolioLib from '@/lib/portfolio';

// Mock the lib functions
vi.mock('@/lib/portfolio', () => ({
    getPortfolioItems: vi.fn(),
    getPortfolioItemBySlug: vi.fn(),
}));

describe('Portfolio Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('successfully fetches all portfolio items', async () => {
        const mockItems: portfolioLib.PortfolioItem[] = [
            { id: '1', slug: 'item-1', lastModified: '2026-07-20', type: 'demo', image: '/1.webp', fullScreenshot: '/full-1.webp', url: '#' }
        ];
        vi.mocked(portfolioLib.getPortfolioItems).mockReturnValue(mockItems);

        const result = await getPortfolioItemsAction();
        expect(result).toEqual(mockItems);
        expect(portfolioLib.getPortfolioItems).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when getPortfolioItems fails', async () => {
        vi.mocked(portfolioLib.getPortfolioItems).mockImplementation(() => {
            throw new Error('Database Error');
        });

        const result = await getPortfolioItemsAction();
        expect(result).toEqual([]);
    });

    it('successfully fetches a portfolio item by slug', async () => {
        const mockItem: portfolioLib.PortfolioItem = { id: '1', slug: 'item-1', lastModified: '2026-07-20', type: 'demo', image: '/1.webp', fullScreenshot: '/full-1.webp', url: '#' };
        vi.mocked(portfolioLib.getPortfolioItemBySlug).mockReturnValue(mockItem);

        const result = await getPortfolioItemBySlugAction('item-1');
        expect(result).toEqual(mockItem);
        expect(portfolioLib.getPortfolioItemBySlug).toHaveBeenCalledWith('item-1');
    });

    it('returns undefined when getPortfolioItemBySlug fails', async () => {
        vi.mocked(portfolioLib.getPortfolioItemBySlug).mockImplementation(() => {
            throw new Error('Not Found');
        });

        const result = await getPortfolioItemBySlugAction('unknown');
        expect(result).toBeUndefined();
    });
});
