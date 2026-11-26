import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import ServiceDeliverables from '@/src/components/services/ServiceDeliverables.astro';

const groups = [
    { label: 'Group One', items: ['Item 1a', 'Item 1b'] },
    { label: 'Group Two', items: ['Item 2a', 'Item 2b'] },
];

const base = {
    title: "What's Included",
    quote: 'Tailored to your business and quoted after a free first call.',
    ctaLabel: 'Book a Free Consultation',
    ctaHref: '/en/services/website-development/#booking',
    groups,
};

describe('ServiceDeliverables', () => {
    it('renders the title, the quote line, every group label and every deliverable item', async () => {
        const screen = await renderAstro(ServiceDeliverables, base);
        expect(screen.getByRole('heading', { name: "What's Included" })).toBeInTheDocument();
        expect(screen.getByText('Tailored to your business and quoted after a free first call.')).toBeInTheDocument();
        // The href is emitted as given: the static build kept the slash before the hash.
        expect(screen.getByRole('link', { name: 'Book a Free Consultation' })).toHaveAttribute(
            'href',
            '/en/services/website-development/#booking'
        );
        for (const group of groups) {
            expect(screen.getByText(group.label)).toBeInTheDocument();
            for (const item of group.items) expect(screen.getByText(item)).toBeInTheDocument();
        }
    });

    it('groups deliverables into labelled clusters, not one flat list', async () => {
        const { body } = await renderAstro(ServiceDeliverables, base);
        // One <ul> per group, never a single flat list holding every item.
        const lists = body.querySelectorAll('ul');
        expect(lists).toHaveLength(groups.length);
        lists.forEach((list, i) => expect(list.querySelectorAll('li')).toHaveLength(groups[i].items.length));
    });

    it('has a DOM shape distinct from BenefitsList and ProcessTimeline (grouped <ul>s, not an <ol> or an unlabelled grid of <div>s)', async () => {
        const { body } = await renderAstro(ServiceDeliverables, base);
        expect(body.querySelector('ol')).toBeNull();
        expect(body.querySelectorAll('ul').length).toBeGreaterThan(0);
    });

    it('renders exactly one CTA: the booking link, with no price and no pay link', async () => {
        const screen = await renderAstro(ServiceDeliverables, base);
        expect(screen.getAllByRole('link')).toHaveLength(1);
        expect(screen.body.textContent).not.toMatch(/€\s?\d|\d\s?€/);
    });

    /**
     * Local SEO lists one group per pillar: four. Three columns would leave the
     * fourth pillar alone on a second row, reading as an afterthought.
     */
    it('lays four groups out two by two, never three plus one', async () => {
        const four = ['One', 'Two', 'Three', 'Four'].map((label) => ({ label, items: ['x'] }));
        const { body } = await renderAstro(ServiceDeliverables, { title: 'T', quote: 'Q', ctaLabel: 'C', ctaHref: '#x', groups: four });
        const grid = body.querySelector('.lg\\:col-span-2');
        expect(grid?.className).toContain('sm:grid-cols-2');
        expect(grid?.className).not.toContain('grid-cols-3');
    });

    it('labels the quote panel and lists its details when given', async () => {
        const screen = await renderAstro(ServiceDeliverables, {
            ...base,
            label: 'Your price',
            details: ['Pages and languages change.', 'No obligation.'],
        });
        expect(screen.getByText('Your price')).toBeInTheDocument();
        expect(screen.getByText('Pages and languages change.')).toBeInTheDocument();
        expect(screen.getByText('No obligation.')).toBeInTheDocument();
    });

    it('never renders an em dash or en dash', async () => {
        const { body } = await renderAstro(ServiceDeliverables, base);
        expect(body.textContent).not.toMatch(/[–—]/);
    });
});
