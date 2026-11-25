/**
 * The byline is the visible half of the Expertise signal: it is what tells a
 * reader which named human is accountable for a page, matching the
 * `author: { '@id': #person }` the schema emits.
 *
 * It also formats a hand-maintained date, and AGENTS.md requires that date to
 * be edited in several places on every content change. A malformed one used to
 * reach Intl and throw a bare "date value is not finite" RangeError that named
 * neither the page nor the value.
 */
import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import ArticleByline from '@/src/components/ArticleByline.astro';
import { PERSON } from '@/lib/site-config';

const base = {
    locale: 'en',
    dateModified: '2026-07-20',
    byLabel: 'Written by',
    updatedLabel: 'Updated',
};

const render = (props: Partial<typeof base> & { readTimeLabel?: string } = {}) => renderAstro(ArticleByline, { ...base, ...props });

describe('ArticleByline', () => {
    it('names the accountable human and their role', async () => {
        const screen = await render();
        expect(screen.getByText(PERSON.name)).toBeDefined();
        expect(screen.getByText(PERSON.jobTitle)).toBeDefined();
        expect(screen.getByText('Written by')).toBeDefined();
    });

    it('links the author to the profile page that publishes the Person node', async () => {
        const screen = await render();
        const link = screen.getByRole('link');
        // The static build canonicalizes on the trailing slash (`localeHref`).
        expect(link.getAttribute('href')).toBe('/en/card/hector/');
        // rel=author is what ties the visible byline to the schema attribution.
        expect(link.getAttribute('rel')).toBe('author');
    });

    it('respects the locale in the profile link', async () => {
        const screen = await render({ locale: 'es' });
        expect(screen.getByRole('link').getAttribute('href')).toBe('/es/card/hector/');
    });

    it('emits a machine-readable <time> carrying the raw ISO date', async () => {
        const { body } = await render();
        expect(body.querySelector('time')?.getAttribute('datetime')).toBe('2026-07-20');
    });

    it('formats the date for the reader in their locale', async () => {
        const en = await render();
        expect(en.body.querySelector('time')?.textContent).toBe('July 20, 2026');

        const es = await render({ locale: 'es' });
        expect(es.body.querySelector('time')?.textContent).toBe('20 de julio de 2026');
    });

    it('renders the read time only when a label is supplied', async () => {
        const without = await render();
        expect(without.queryByText(/min read/)).toBeNull();

        const withLabel = await render({ readTimeLabel: '7 min read' });
        expect(withLabel.getByText('7 min read')).toBeDefined();
    });

    /**
     * A malformed date must not take the build down. This component renders on
     * every content page, so throwing here would fail the whole static build
     * and block deploying the other two dozen pages over one typo. The strict
     * check lives at the data boundary instead (the sitemap), where it can name
     * the offending route.
     */
    it.each([
        ['2026-7-20', 'single-digit month'],
        ['20-07-2026', 'day-first'],
        ['2026-02-31', 'rolls over into March'],
        ['not a date', 'free text'],
    ])('degrades to the raw value on a malformed date (%s: %s)', async (bad) => {
        const { body } = await render({ dateModified: bad });

        // No <time> element at all: `datetime` must hold a valid HTML5 date,
        // and the whole reason we are on this path is that it is not one.
        expect(body.querySelector('time')).toBeNull();

        const fallback = body.querySelector('[data-invalid-date]');
        expect(fallback?.textContent).toBe(bad);
    });

    it('emits a valid <time> only when the date actually parses', async () => {
        const { body } = await render();
        const time = body.querySelector('time');
        expect(time?.getAttribute('datetime')).toBe('2026-07-20');
        // Every datetime we do emit must satisfy the HTML5 date grammar.
        expect(time?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(body.querySelector('[data-invalid-date]')).toBeNull();
    });

    it('still formats correctly for every other page when one date is broken', async () => {
        await render({ dateModified: 'garbage' });
        const { body } = await render();
        expect(body.querySelector('time')?.textContent).toBe('July 20, 2026');
    });

    it('renders the date in UTC so it cannot drift a day by timezone', async () => {
        const { body } = await render({ dateModified: '2026-01-01' });
        expect(body.querySelector('time')?.textContent).toBe('January 1, 2026');
    });
});
