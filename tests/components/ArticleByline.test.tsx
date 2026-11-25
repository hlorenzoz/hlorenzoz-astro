/**
 * The byline is the visible half of the Expertise signal: it is what tells a
 * reader which named human is accountable for a page, matching the
 * `author: { '@id': #person }` the schema emits.
 *
 * It also formats a hand-maintained date, and AGENTS.md now requires that date
 * to be edited in three separate files on every content change. A malformed one
 * used to reach Intl and throw a bare "date value is not finite" RangeError
 * that named neither the page nor the value.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleByline } from '@/components/ArticleByline';
import { PERSON } from '@/lib/site-config';

const base = {
    locale: 'en',
    dateModified: '2026-07-20',
    byLabel: 'Written by',
    updatedLabel: 'Updated',
};

describe('ArticleByline', () => {
    it('names the accountable human and their role', () => {
        render(<ArticleByline {...base} />);
        expect(screen.getByText(PERSON.name)).toBeDefined();
        expect(screen.getByText(PERSON.jobTitle)).toBeDefined();
        expect(screen.getByText('Written by')).toBeDefined();
    });

    it('links the author to the profile page that publishes the Person node', () => {
        render(<ArticleByline {...base} />);
        const link = screen.getByRole('link');
        expect(link.getAttribute('href')).toBe('/en/card/hector');
        // rel=author is what ties the visible byline to the schema attribution.
        expect(link.getAttribute('rel')).toBe('author');
    });

    it('respects the locale in the profile link', () => {
        render(<ArticleByline {...base} locale="es" />);
        expect(screen.getByRole('link').getAttribute('href')).toBe('/es/card/hector');
    });

    it('emits a machine-readable <time> carrying the raw ISO date', () => {
        const { container } = render(<ArticleByline {...base} />);
        const time = container.querySelector('time');
        expect(time?.getAttribute('dateTime')).toBe('2026-07-20');
    });

    it('formats the date for the reader in their locale', () => {
        const { container: en } = render(<ArticleByline {...base} />);
        expect(en.querySelector('time')?.textContent).toBe('July 20, 2026');

        const { container: es } = render(<ArticleByline {...base} locale="es" />);
        expect(es.querySelector('time')?.textContent).toBe('20 de julio de 2026');
    });

    it('renders the read time only when a label is supplied', () => {
        const { queryByText } = render(<ArticleByline {...base} />);
        expect(queryByText(/min read/)).toBeNull();

        render(<ArticleByline {...base} readTimeLabel="7 min read" />);
        expect(screen.getByText('7 min read')).toBeDefined();
    });

    /**
     * A malformed date must not take the build down. This component renders on
     * every content page, so throwing here would fail the whole static export
     * and block deploying the other two dozen pages over one typo. The strict
     * check lives at the data boundary instead (`app/sitemap.ts`), where it can
     * name the offending route.
     */
    it.each([
        ['2026-7-20', 'single-digit month'],
        ['20-07-2026', 'day-first'],
        ['2026-02-31', 'rolls over into March'],
        ['not a date', 'free text'],
    ])('degrades to the raw value on a malformed date (%s: %s)', (bad) => {
        expect(() => render(<ArticleByline {...base} dateModified={bad} />)).not.toThrow();
        const { container } = render(<ArticleByline {...base} dateModified={bad} />);

        // No <time> element at all: `datetime` must hold a valid HTML5 date,
        // and the whole reason we are on this path is that it is not one.
        // Emitting <time datetime="not a date"> would be invalid markup against
        // an accessibility gate that is an error at 0.95, and would feed
        // crawlers a malformed date on a page about freshness.
        expect(container.querySelector('time')).toBeNull();

        const fallback = container.querySelector('[data-invalid-date]');
        expect(fallback?.textContent).toBe(bad);
    });

    it('emits a valid <time> only when the date actually parses', () => {
        const { container: good } = render(<ArticleByline {...base} />);
        const time = good.querySelector('time');
        expect(time?.getAttribute('dateTime')).toBe('2026-07-20');
        // Every datetime we do emit must satisfy the HTML5 date grammar.
        expect(time?.getAttribute('dateTime')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(good.querySelector('[data-invalid-date]')).toBeNull();
    });

    it('still formats correctly for every other page when one date is broken', () => {
        render(<ArticleByline {...base} dateModified="garbage" />);
        const { container } = render(<ArticleByline {...base} />);
        expect(container.querySelector('time')?.textContent).toBe('July 20, 2026');
    });

    it('renders the date in UTC so it cannot drift a day by timezone', () => {
        const { container } = render(<ArticleByline {...base} dateModified="2026-01-01" />);
        expect(container.querySelector('time')?.textContent).toBe('January 1, 2026');
    });
});
