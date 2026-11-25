/**
 * Google's structured data policy: "Don't mark up content that is not visible
 * to readers of the page." Every page that emits a BreadcrumbList must show the
 * same trail, so this renders each page type and holds the visible crumbs to
 * the JSON-LD ones: same names, same order, same targets.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
    usePathname: () => '/en/',
    useParams: () => ({ locale: 'en' }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

import HomePage from '@/app/[locale]/page';
import NewsPage from '@/app/[locale]/news/page';
import NewsPostPage from '@/app/[locale]/news/[slug]/page';
import PortfolioPage from '@/app/[locale]/portfolio/page';
import PortfolioItemPage from '@/app/[locale]/portfolio/[slug]/page';
import PrivacyPolicyPage from '@/app/[locale]/privacy-policy/page';
import TermsPage from '@/app/[locale]/terms-conditions/page';
import CookiePolicyPage from '@/app/[locale]/cookie-policy/page';
import SitemapPage from '@/app/[locale]/sitemap/page';
import ServicesHubPage from '@/app/[locale]/services/page';
import LocalSeoPage from '@/app/[locale]/services/local-seo/page';
import WebsiteDevelopmentPage from '@/app/[locale]/services/website-development/page';
import AiVoiceReceptionistPage from '@/app/[locale]/services/ai-voice-receptionist/page';
import SoftwareDevelopmentPage from '@/app/[locale]/services/software-development/page';

/** Every page reads `locale`; the detail pages also read `slug`, which the rest ignore. */
type Page = (props: { params: Promise<{ locale: string; slug: string }> }) => Promise<React.ReactElement>;
type Node = Record<string, unknown>;
type ListItem = { name: string; item: string };

const p = <T,>(v: T) => Promise.resolve(v);

function schemaCrumbs(container: HTMLElement): ListItem[] | undefined {
    const node = [...container.querySelectorAll('script[type="application/ld+json"]')]
        .map((s) => JSON.parse(s.textContent ?? '{}'))
        .flatMap((d: Node) => (d['@graph'] as Node[]) ?? [d])
        .find((n) => n['@type'] === 'BreadcrumbList');
    return node?.itemListElement as ListItem[] | undefined;
}

/** The mocked translator echoes keys, so the label is a key ending in `breadcrumb`. */
function visibleNav(container: HTMLElement) {
    return container.querySelector('nav[aria-label$="breadcrumb"]');
}

const PAGES: [string, Page, string][] = [
    ['news listing', NewsPage, ''],
    ['news post', NewsPostPage, 'masajes-orisha-added-to-portfolio'],
    ['portfolio listing', PortfolioPage, ''],
    ['portfolio detail', PortfolioItemPage, 'masajes-orisha'],
    ['privacy policy', PrivacyPolicyPage, ''],
    ['terms and conditions', TermsPage, ''],
    ['cookie policy', CookiePolicyPage, ''],
    ['HTML sitemap', SitemapPage, ''],
    ['services hub', ServicesHubPage, ''],
    ['local seo', LocalSeoPage, ''],
    ['website development', WebsiteDevelopmentPage, ''],
    ['ai voice receptionist', AiVoiceReceptionistPage, ''],
    ['software development', SoftwareDevelopmentPage, ''],
];

describe.each(['en', 'es'])('visible breadcrumb (%s)', (locale) => {
    it.each(PAGES)('%s shows the same trail its BreadcrumbList declares', async (_name, Page, slug) => {
        const { container } = render(await Page({ params: p({ locale, slug }) }));
        const schema = schemaCrumbs(container);
        expect(schema, 'page emits a BreadcrumbList').toBeDefined();

        const nav = visibleNav(container);
        expect(nav, 'page renders a visible breadcrumb').not.toBeNull();
        const items = [...nav!.querySelectorAll('ol > li')];
        expect(items.map((li) => li.textContent)).toEqual(schema!.map((c) => c.name));

        // Every crumb but the current page links to the JSON-LD `item`, as a
        // site-relative path. next/link drops the trailing slash in Vitest.
        const hrefs = items.slice(0, -1).map((li) => li.querySelector('a')?.getAttribute('href'));
        expect(hrefs.map((h) => h?.replace(/\/?$/, '/'))).toEqual(
            schema!.slice(0, -1).map((c) => new URL(c.item).pathname)
        );
        expect(items.at(-1)!.querySelector('a')).toBeNull();
        expect(items.at(-1)!.querySelector('[aria-current="page"]')).not.toBeNull();
    });
});

describe('home page', () => {
    it('renders no visible breadcrumb', async () => {
        const { container } = render(await HomePage({ params: p({ locale: 'en' }) }));
        expect(visibleNav(container)).toBeNull();
    });
});
