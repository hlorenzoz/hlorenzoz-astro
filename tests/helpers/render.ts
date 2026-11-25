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

type AstroComponent = Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer | undefined;

export async function renderAstro(
    Component: AstroComponent,
    props: Record<string, unknown> = {},
    slots: Record<string, string> = {}
) {
    container ??= await AstroContainer.create({ renderers: await loadRenderers([reactRenderer()]) });
    const html = await container.renderToString(Component, { props, slots });
    const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
    return { html, document, body: document.body, ...within(document.body) };
}
