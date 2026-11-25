import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { within } from '@testing-library/dom';
import { renderAstro } from '@/tests/helpers/render';
import CalBooking from '@/src/components/services/CalBooking.astro';

const SOURCE = readFileSync(path.resolve(__dirname, '../../src/components/services/CalBooking.astro'), 'utf-8');

describe('CalBooking', () => {
    it('renders the Cal.com iframe with the expected src, lazy loading and a title', async () => {
        const { body } = await renderAstro(CalBooking);
        const iframe = body.querySelector('iframe');
        expect(iframe).not.toBeNull();
        expect(iframe).toHaveAttribute('src', 'https://cal.com/hlorenzoz.com/15min?embed=true');
        expect(iframe).toHaveAttribute('loading', 'lazy');
        expect(iframe!.getAttribute('title')).toBeTruthy();
    });

    /**
     * Static markup: no state, no handler. It once shipped as client code,
     * which only pushed static markup into the client bundle of every page
     * that rendered it. It must stay script-free.
     */
    it('ships no client JS: no script, no hydration directive', () => {
        expect(SOURCE).not.toMatch(/<script/);
        expect(SOURCE).not.toMatch(/client:\w+/);
    });

    /**
     * `aria-labelledby` on a roleless `<div>` labels nothing: such a div is
     * never exposed to assistive tech as a region, so the heading association
     * was inert and a screen-reader user heard only the iframe's own title.
     */
    it('exposes a labelled region, not a bare div, when given a titleId', async () => {
        const { body } = await renderAstro(CalBooking, { titleId: 'booking-heading' });
        body.insertAdjacentHTML('afterbegin', '<h2 id="booking-heading">Book a call</h2>');
        const region = within(body).getByRole('region', { name: 'Book a call' });
        expect(region.tagName).toBe('SECTION');
    });

    it('renders without a region role when no titleId is given', async () => {
        // A <section> with no accessible name is not exposed as a region, which
        // is correct: an unnamed landmark is noise in a screen reader's list.
        const screen = await renderAstro(CalBooking);
        expect(screen.queryByRole('region')).toBeNull();
        expect(screen.body.querySelector('section')).not.toHaveAttribute('aria-labelledby');
    });
});
