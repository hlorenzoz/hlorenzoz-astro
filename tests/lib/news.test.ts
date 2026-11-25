import { describe, it, expect, vi, afterEach } from 'vitest';
import newsData from '@/lib/news-data.json';
import { getPortfolioItems } from '@/lib/portfolio';
import {
    getNewsItems,
    getNewsItemBySlug,
    latestNewsModified,
    validateNewsItems,
    type NewsItem,
} from '@/lib/news';
import { getNewsItemsAction, getNewsItemBySlugAction } from '@/lib/actions/news';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

const PORTFOLIO_IDS = new Set(['masajes-orisha', 'vicron-lopez']);

const VALID: NewsItem = {
    id: 'post-a',
    slug: 'post-a',
    datePublished: '2026-11-01',
    lastModified: '2026-11-02',
    portfolioId: 'masajes-orisha',
    image: 'https://cdn.hlorenzoz.com/a.webp',
};

describe('validateNewsItems', () => {
    it('accepts a well-formed list unchanged', () => {
        expect(validateNewsItems([VALID], PORTFOLIO_IDS)).toEqual([VALID]);
    });

    it('rejects an empty list, which would fail the static export anyway', () => {
        expect(() => validateNewsItems([], PORTFOLIO_IDS)).toThrow(/empty/);
    });

    it('rejects a portfolioId the portfolio does not define', () => {
        expect(() => validateNewsItems([{ ...VALID, portfolioId: 'ghost' }], PORTFOLIO_IDS))
            .toThrow('news item "post-a" references unknown portfolioId "ghost"');
    });

    it.each([
        ['datePublished', '2026-11-1'],
        ['lastModified', '2026-02-31'],
    ] as const)('rejects a malformed %s', (field, value) => {
        expect(() => validateNewsItems([{ ...VALID, [field]: value }], PORTFOLIO_IDS))
            .toThrow(new RegExp(`news item "post-a" ${field}`));
    });

    it('rejects a lastModified earlier than its datePublished', () => {
        expect(() => validateNewsItems([{ ...VALID, lastModified: '2026-10-01' }], PORTFOLIO_IDS))
            .toThrow(/earlier than its datePublished/);
    });

    it('rejects a duplicate slug', () => {
        expect(() => validateNewsItems([VALID, { ...VALID, id: 'post-b' }], PORTFOLIO_IDS))
            .toThrow('duplicate news slug "post-a"');
    });

    it('rejects a duplicate id', () => {
        expect(() => validateNewsItems([VALID, { ...VALID, slug: 'post-b' }], PORTFOLIO_IDS))
            .toThrow('duplicate news id "post-a"');
    });
});

describe('news data source', () => {
    it('validates the real data against the real portfolio', () => {
        const ids = new Set(getPortfolioItems().map((p) => p.id));
        expect(() => validateNewsItems(newsData as NewsItem[], ids)).not.toThrow();
    });

    it('returns posts newest first (appended last in the JSON)', () => {
        expect(getNewsItems().map((n) => n.id)).toEqual((newsData as NewsItem[]).map((n) => n.id).reverse());
    });

    it('does not mutate the imported array', () => {
        const before = (newsData as NewsItem[]).map((n) => n.id);
        getNewsItems().pop();
        expect((newsData as NewsItem[]).map((n) => n.id)).toEqual(before);
    });

    it('finds a post by slug and misses an unknown one', () => {
        const first = getNewsItems()[0];
        expect(getNewsItemBySlug(first.slug)).toEqual(first);
        expect(getNewsItemBySlug('nope')).toBeUndefined();
    });

    it('reports the newest lastModified across all posts', () => {
        const max = (newsData as NewsItem[]).map((n) => n.lastModified).sort().at(-1);
        expect(latestNewsModified()).toBe(max);
    });

    it('seeds the masajes-orisha announcement', () => {
        const seed = getNewsItemBySlug('masajes-orisha-added-to-portfolio');
        expect(seed).toMatchObject({
            portfolioId: 'masajes-orisha',
            datePublished: '2026-11-24',
            lastModified: '2026-11-24',
        });
        expect(seed?.image).toMatch(/^https:\/\/cdn\.hlorenzoz\.com\/.+\.webp$/);
        expect(seed?.ogImage).toBeUndefined();
    });

    it('announces gerp-dj with a .jpeg social image', () => {
        const post = getNewsItemBySlug('gerp-dj-added-to-portfolio');
        expect(post).toMatchObject({ portfolioId: 'gerp-dj', datePublished: '2026-11-24', lastModified: '2026-11-24' });
        expect(post?.image).toMatch(/^https:\/\/cdn\.hlorenzoz\.com\/.+\.webp$/);
        expect(post?.ogImage).toMatch(/^https:\/\/cdn\.hlorenzoz\.com\/.+\.jpeg$/);
    });

    it('gives every post its copy in both locales', () => {
        for (const item of getNewsItems()) {
            for (const messages of [en, es]) {
                const copy = (messages.news.items as Record<string, { title: string; description: string; paragraphs: string[] }>)[item.id];
                expect(copy?.title, `${item.id} title`).toBeTruthy();
                expect(copy?.description, `${item.id} description`).toBeTruthy();
                expect(copy?.paragraphs.length, `${item.id} paragraphs`).toBeGreaterThanOrEqual(3);
            }
        }
    });
});

describe('news actions', () => {
    afterEach(() => vi.restoreAllMocks());

    it('wrap the loader', async () => {
        expect(await getNewsItemsAction()).toEqual(getNewsItems());
        const first = getNewsItems()[0];
        expect(await getNewsItemBySlugAction(first.slug)).toEqual(first);
        expect(await getNewsItemBySlugAction('nope')).toBeUndefined();
    });
});

describe('home section copy', () => {
    it('names the LinkedIn carousel as LinkedIn articles in both locales', () => {
        expect(en.articles.title).toBe('Latest LinkedIn Articles');
        expect(es.articles.title).toBe('Últimos artículos de LinkedIn');
    });
});
