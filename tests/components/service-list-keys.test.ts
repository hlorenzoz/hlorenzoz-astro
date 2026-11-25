import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import BenefitsList from '@/src/components/services/BenefitsList.astro';
import ProcessTimeline from '@/src/components/services/ProcessTimeline.astro';
import SocialProofStrip from '@/src/components/services/SocialProofStrip.astro';
import ServiceDeliverables from '@/src/components/services/ServiceDeliverables.astro';

/**
 * Every list in the service components iterates translatable strings
 * (`item.title`, `step.number`, `item.author`, `group.label`), and a copy edit
 * or a translation can repeat one. Under React a repeat collided as a key;
 * Astro has no keys, so the guard is now the observable one: a deliberate
 * duplicate is rendered every time it appears, never collapsed.
 */
describe('service list components tolerate duplicate content', () => {
    it('BenefitsList: two benefits with the same title', async () => {
        const screen = await renderAstro(BenefitsList, {
            title: 't',
            items: [
                { title: 'Same', description: 'a' },
                { title: 'Same', description: 'b' },
            ],
        });
        expect(screen.getAllByText('Same')).toHaveLength(2);
    });

    it('ProcessTimeline: two steps sharing a number', async () => {
        const { body } = await renderAstro(ProcessTimeline, {
            title: 't',
            steps: [
                { number: '01', title: 'a', description: 'x' },
                { number: '01', title: 'b', description: 'y' },
            ],
        });
        expect(body.querySelectorAll('li')).toHaveLength(2);
    });

    it('SocialProofStrip: two quotes from the same author', async () => {
        const screen = await renderAstro(SocialProofStrip, {
            items: [
                { quote: 'q1', author: 'Ana', position: 'CEO' },
                { quote: 'q2', author: 'Ana', position: 'CEO' },
            ],
        });
        expect(screen.getAllByText('Ana')).toHaveLength(2);
    });

    it('ServiceDeliverables: repeated group label and repeated item', async () => {
        const screen = await renderAstro(ServiceDeliverables, {
            title: 't',
            price: '€1',
            ctaLabel: 'Book',
            ctaHref: '/x',
            groups: [
                { label: 'Group', items: ['Same', 'Same'] },
                { label: 'Group', items: ['Other'] },
            ],
        });
        expect(screen.getAllByText('Group')).toHaveLength(2);
        expect(screen.getAllByText('Same')).toHaveLength(2);
    });
});
