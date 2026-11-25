import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { CalBooking } from '@/components/services/CalBooking';

const SOURCE = readFileSync(
    path.resolve(__dirname, '../../components/services/CalBooking.tsx'),
    'utf-8'
);

describe('CalBooking', () => {
    it('renders the Cal.com iframe with the expected src, lazy loading and a title', () => {
        const { container } = render(<CalBooking />);

        const iframe = container.querySelector('iframe');
        expect(iframe).not.toBeNull();
        expect(iframe).toHaveAttribute('src', 'https://cal.com/hlorenzoz.com/15min?embed=true');
        expect(iframe).toHaveAttribute('loading', 'lazy');
        expect(iframe!.getAttribute('title')).toBeTruthy();
    });

    /**
     * This component is static markup: no state, no effect, no handler. It
     * once carried `'use client'`, justified as "an iframe wrapper cannot be a
     * Server Component boundary crossing back into a client tree", which is
     * not a real constraint. The directive only pushed static markup into the
     * client bundle of all seven pages that render it.
     */
    it('is a Server Component: no directive, no hooks, no handlers', () => {
        // Anchored to the start of a line: the docblock below discusses the
        // directive in prose, and a bare substring match would hit that too.
        expect(SOURCE).not.toMatch(/^\s*['"]use client['"]\s*;?\s*$/m);
        expect(SOURCE).not.toMatch(/use(State|Effect|Reducer|Ref|Callback|Memo)\(/);
        expect(SOURCE).not.toMatch(/on[A-Z]\w+=/);
    });

    /**
     * `aria-labelledby` on a roleless `<div>` labels nothing: such a div is
     * never exposed to assistive tech as a region, so the heading association
     * was inert and a screen-reader user heard only the iframe's own title.
     */
    it('exposes a labelled region, not a bare div, when given a titleId', () => {
        render(
            <>
                <h2 id="booking-heading">Book a call</h2>
                <CalBooking titleId="booking-heading" />
            </>
        );

        const region = screen.getByRole('region', { name: 'Book a call' });
        expect(region).toBeInTheDocument();
        expect(region.tagName).toBe('SECTION');
    });

    it('renders without a region role when no titleId is given', () => {
        // A <section> with no accessible name is not exposed as a region, which
        // is correct: an unnamed landmark is noise in a screen reader's list.
        render(<CalBooking />);
        expect(screen.queryByRole('region')).toBeNull();
    });
});
