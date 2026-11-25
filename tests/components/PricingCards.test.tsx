import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TaxMark } from '@/components/pricing/TaxMark';
import { CorePlanCard } from '@/components/pricing/CorePlanCard';
import { AddOnCard } from '@/components/pricing/AddOnCard';

/**
 * Every published price is before tax, and the dossier marks each one "+ VAT".
 * The site has to do the same or the two documents disagree about what a client
 * pays. These tests pin the marker to the figure it qualifies: not "somewhere on
 * the card", but inside the same price line.
 */
describe('TaxMark', () => {
    it('renders the marker it is given', () => {
        render(<TaxMark label="+ VAT" />);
        expect(screen.getByTestId('tax-mark')).toHaveTextContent('+ VAT');
    });
});

const core = {
    popular: 'The core offer',
    title: 'Local SEO',
    subtitle: 'All four pillars included',
    price: '€750',
    period: '/ mo',
    tax: '+ VAT',
    goal: 'Goal: the first position on Google',
    ctaLabel: 'Book a call',
    ctaHref: '#contact',
    learnMoreLabel: 'Learn more',
    learnMoreHref: '/en/services/local-seo/',
    groups: [
        { label: 'Authority content', items: ['Keyword research', 'Content clusters'] },
        { label: 'Review management', items: ['Review growth tracked over time'] },
    ],
};

describe('CorePlanCard', () => {
    it('shows the price with its period and its tax marker in one line', () => {
        render(<CorePlanCard {...core} />);
        const line = screen.getByTestId('core-plan-price');
        expect(line).toHaveTextContent('€750');
        expect(line).toHaveTextContent('/ mo');
        expect(within(line).getByTestId('tax-mark')).toHaveTextContent('+ VAT');
    });

    /**
     * The card is the one core offer, so it has to read as the focal point of
     * the section. `force-dark-theme` pins `border-color` to a half-transparent
     * blue with `!important`, which left the outline barely visible. A ring is a
     * box-shadow, so that rule cannot dim it.
     */
    it('is outlined with a solid ring, not only the dimmed theme border', () => {
        render(<CorePlanCard {...core} />);
        const card = screen.getByTestId('core-plan-card');
        expect(card.className).toContain('ring-2');
        expect(card.className).toContain('ring-blue-500');
        // And the ring must not be weakened with an opacity modifier.
        expect(card.className).not.toMatch(/ring-blue-500\/\d/);
    });

    it('lists every pillar group with its items', () => {
        render(<CorePlanCard {...core} />);
        expect(screen.getByText('Authority content')).toBeInTheDocument();
        expect(screen.getByText('Review growth tracked over time')).toBeInTheDocument();
    });

    it('keeps the conversion CTA and adds a named learn-more link', () => {
        render(<CorePlanCard {...core} />);
        expect(screen.getByRole('link', { name: 'Book a call' })).toHaveAttribute('href', '#contact');
        const more = screen.getByTestId('pricing-learn-more');
        expect(more).toHaveAttribute('href', '/en/services/local-seo');
        // The visible label is short; the sr-only span carries the offer name so
        // the link is not a bare "Learn more" to a screen reader or a crawler.
        expect(more.textContent).toContain('Local SEO');
        expect(more).not.toHaveAttribute('aria-label');
    });
});

const addOn = {
    title: 'Website Development',
    subtitle: 'Websites built to convert',
    listPrice: '€2,500',
    bundlePrice: '€1,750',
    listLabel: 'List price',
    bundleLabel: 'With Local SEO',
    terms: 'one-off payment',
    tax: '+ VAT',
    features: ['Landing page or full multi-page website'],
    ctaLabel: 'Get started',
    ctaHref: '#contact',
    learnMoreLabel: 'Learn more',
    learnMoreHref: '/en/services/website-development/',
};

describe('AddOnCard', () => {
    it('strikes the list price and states the bundled one beside its label', () => {
        render(<AddOnCard {...addOn} />);
        const list = screen.getByTestId('addon-list-price');
        expect(list.tagName).toBe('S');
        expect(list).toHaveTextContent('€2,500');
        expect(screen.getByText('With Local SEO')).toBeInTheDocument();
        expect(screen.getByTestId('addon-bundle-price')).toHaveTextContent('€1,750');
    });

    it('marks the bundled price as before tax', () => {
        render(<AddOnCard {...addOn} />);
        expect(within(screen.getByTestId('addon-terms')).getByTestId('tax-mark')).toHaveTextContent('+ VAT');
    });

    it('says "from" only when the price is a floor', () => {
        const { rerender } = render(<AddOnCard {...addOn} />);
        expect(screen.queryByTestId('addon-from')).toBeNull();
        rerender(<AddOnCard {...addOn} fromLabel="from" />);
        expect(screen.getByTestId('addon-from')).toHaveTextContent('from');
    });

    it('lists its features and links to its page', () => {
        render(<AddOnCard {...addOn} />);
        expect(screen.getByText('Landing page or full multi-page website')).toBeInTheDocument();
        expect(screen.getByTestId('pricing-learn-more')).toHaveAttribute('href', '/en/services/website-development');
    });
});
