/**
 * Renders a whole Astro page (BaseLayout included) with the Container API and
 * parses it as a full document, so head tags are queryable where they really
 * are. `renderAstro()` wraps output in a <body>, which is right for components
 * but would scatter a page's <head> into the body.
 *
 * Used by the SEO suites that used to call Next's `generateMetadata` and render
 * the page component: in Astro the metadata is computed in the page frontmatter,
 * so the rendered head IS the metadata.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as reactRenderer } from '@astrojs/react';
import { loadRenderers } from 'astro:container';
import { JSDOM } from 'jsdom';
import { assertSchemaInvariants } from '@/lib/schema/datetime';
import config from '@/astro.config.mjs';

type AstroComponent = Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer | undefined;

export async function renderPage(Page: unknown, params: Record<string, string>, path?: string): Promise<Document> {
    // `site` feeds `Astro.site`, which Head.astro resolves relative og:image URLs against.
    container ??= await AstroContainer.create({
        astroConfig: { site: config.site, trailingSlash: config.trailingSlash },
        renderers: await loadRenderers([reactRenderer()]),
    });
    const url = new URL(path ?? `/${params.locale}/`, 'https://hlorenzoz.com');
    const html = await container.renderToString(Page as AstroComponent, { params, request: new Request(url) });
    return new JSDOM(html).window.document;
}

/** The SEO facts of a rendered head, in the shape the old Next metadata had. */
export function headFacts(document: Document) {
    const attr = (selector: string, name: string) => document.head.querySelector(selector)?.getAttribute(name) ?? null;
    const languages = Object.fromEntries(
        [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => [
            l.getAttribute('hreflang'),
            l.getAttribute('href'),
        ])
    );
    return {
        title: document.head.querySelector('title')?.textContent ?? null,
        description: attr('meta[name="description"]', 'content'),
        canonicals: [...document.head.querySelectorAll('link[rel="canonical"]')].map((l) => l.getAttribute('href')),
        canonical: attr('link[rel="canonical"]', 'href'),
        languages,
        ogUrl: attr('meta[property="og:url"]', 'content'),
        ogType: attr('meta[property="og:type"]', 'content'),
        ogImages: [...document.head.querySelectorAll('meta[property="og:image"]')].map((m) => m.getAttribute('content')),
        ogPublished: attr('meta[property="article:published_time"]', 'content'),
        ogModified: attr('meta[property="article:modified_time"]', 'content'),
    };
}

/** Every JSON-LD block on the page, parsed and checked like JsonLd.astro does. */
export function jsonLd(document: Document): Record<string, unknown>[] {
    return [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
        const data = JSON.parse(s.textContent ?? '');
        assertSchemaInvariants(data);
        return data;
    });
}

/** Every node of every JSON-LD block, flattening `@graph`. */
export function jsonLdNodes(document: Document): Record<string, unknown>[] {
    return jsonLd(document).flatMap((block) =>
        Array.isArray(block['@graph']) ? (block['@graph'] as Record<string, unknown>[]) : [block]
    );
}
