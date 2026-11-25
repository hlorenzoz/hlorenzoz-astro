/**
 * Shared `Metadata` builder for every non-home page.
 *
 * Why this exists: the layout's defaults are merged shallowly (as Next did), so a page that omits
 * `openGraph` inherits the entire block from `src/layouts/BaseLayout.astro`,
 * including its `url`. That shipped `og:url = https://hlorenzoz.com/` on pages
 * whose canonical was `https://hlorenzoz.com/en/privacy-policy/`, a page
 * telling crawlers it is the homepage.
 *
 * Routing every page through `pageMetadata()` makes that structurally
 * impossible: canonical, hreflang, `og:url`, and the Twitter card are all
 * derived from the same `path`, so they cannot disagree.
 */
import { schemaDateTime } from '@/lib/schema/datetime';
import { findRoute } from '@/lib/routes';
import {
    absoluteUrl,
    languageAlternates,
    ogLocale,
    OG_IMAGE,
    SITE_NAME,
} from '@/lib/site-config';

/**
 * The subset of head metadata this site emits, rendered by
 * `src/components/Head.astro`. Field names follow the common `Metadata` object shape
 * the builders were written against, so they carried over unchanged.
 */
export interface OgImage {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
}

export interface PageMeta {
    title?: string;
    description?: string;
    keywords?: string[];
    category?: string;
    /** e.g. 'noindex' for the 404 page. */
    robots?: string;
    alternates?: { canonical?: string; languages?: Record<string, string> };
    openGraph?: {
        title?: string;
        description?: string;
        url?: string;
        siteName?: string;
        locale?: string;
        type?: string;
        images?: OgImage[];
        publishedTime?: string;
        modifiedTime?: string;
        authors?: string[];
    };
    twitter?: { card?: string; title?: string; description?: string; images?: string[] };
}

export interface PageMetadataInput {
    locale: string;
    /** Route path relative to the locale root, e.g. 'privacy-policy'. */
    path: string;
    /** Full title tag, already suffixed by the caller. */
    title: string;
    description: string;
    /** Absolute image URL. Falls back to the shared OG image. */
    image?: string;
    /** Alt text for the OG image. Defaults to the title. */
    imageAlt?: string;
    /** OpenGraph object type. `article` for supporting content. */
    type?: 'website' | 'article';
    /**
     * `YYYY-MM-DD` dates, emitted only for `type: 'article'`, widened to the same
     * zoned datetime the JSON-LD carries so both surfaces agree.
     */
    publishedTime?: string;
    modifiedTime?: string;
}

export function pageMetadata({
    locale,
    path,
    title,
    description,
    image = OG_IMAGE,
    imageAlt,
    type = 'website',
    publishedTime,
    modifiedTime,
}: PageMetadataInput): PageMeta {
    const url = absoluteUrl(locale, path);

    return {
        title,
        description,
        alternates: {
            canonical: url,
            // Only the locales the page is built in (the route registry). A path
            // the live registry does not know (the content factory's injected
            // registry in tests) can vouch only for the page being rendered.
            languages: languageAlternates(path, findRoute(path)?.locales ?? [locale]),
        },
        openGraph: {
            title,
            description,
            // Always the page's own canonical. Never inherited.
            url,
            siteName: SITE_NAME,
            locale: ogLocale(locale),
            type,
            images: [{ url: image, alt: imageAlt ?? title }],
            ...(type === 'article' && publishedTime ? { publishedTime: schemaDateTime(publishedTime) } : {}),
            ...(type === 'article' && modifiedTime ? { modifiedTime: schemaDateTime(modifiedTime) } : {}),
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
        },
    };
}
