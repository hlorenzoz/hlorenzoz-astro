/**
 * Renders an Astro component to HTML with the Container API and mounts it in a
 * fresh JSDOM document, so `@testing-library/dom` queries (`getByRole`, ...)
 * and jest-dom matchers work as they did with React Testing Library.
 *
 * Astro components only compile for the server, so test files using this run
 * in the default `node` environment (vitest.config.ts).
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getContainerRenderer as reactRenderer } from '@astrojs/react';
import { loadRenderers } from 'astro:container';
import { within } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import config from '../../astro.config.mjs';

type AstroComponent = Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer | undefined;

export async function renderAstro(
    Component: AstroComponent,
    props: Record<string, unknown> = {},
    slots: Record<string, string> = {},
    /** `url` sets `Astro.url` (Navbar/Footer read it); `params` sets `Astro.params` for pages. */
    { url, params }: { url?: string; params?: Record<string, string> } = {}
) {
    // `site` feeds `Astro.site`, which Head.astro resolves relative og:image URLs against.
    container ??= await AstroContainer.create({
        astroConfig: { site: config.site, trailingSlash: config.trailingSlash },
        renderers: await loadRenderers([reactRenderer()]),
    });
    const request = url ? new Request(new URL(url, 'https://hlorenzoz.com')) : undefined;
    const html = await container.renderToString(Component, { props, slots, request, params });
    const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
    return { html, document, body: document.body, ...within(document.body) };
}
