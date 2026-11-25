import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BenefitsList } from '@/components/services/BenefitsList';
import { ProcessTimeline } from '@/components/services/ProcessTimeline';
import { SocialProofStrip } from '@/components/services/SocialProofStrip';
import { ServiceDeliverables } from '@/components/services/ServiceDeliverables';

/**
 * Every list in the service components keys on a translatable string
 * (`item.title`, `step.number`, `item.author`, `group.label`). A repeat after
 * a copy edit or a translation collides. One instance was fixed in an earlier
 * round; these render each component with a DELIBERATE duplicate and assert
 * React logs no key warning, so the whole class stays fixed rather than the
 * one spot that got reported.
 */
function expectNoKeyWarning(fn: () => void) {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
        fn();
        const warned = spy.mock.calls.some((args) =>
            args.some((a) => typeof a === 'string' && /same key|unique "key"/i.test(a))
        );
        expect(warned, 'React logged a duplicate-key warning').toBe(false);
    } finally {
        spy.mockRestore();
    }
}

describe('service list components tolerate duplicate content', () => {
    it('BenefitsList: two benefits with the same title', () => {
        expectNoKeyWarning(() =>
            render(
                <BenefitsList
                    title="t"
                    items={[
                        { title: 'Same', description: 'a' },
                        { title: 'Same', description: 'b' },
                    ]}
                />
            )
        );
    });

    it('ProcessTimeline: two steps sharing a number', () => {
        expectNoKeyWarning(() =>
            render(
                <ProcessTimeline
                    title="t"
                    steps={[
                        { number: '01', title: 'a', description: 'x' },
                        { number: '01', title: 'b', description: 'y' },
                    ]}
                />
            )
        );
    });

    it('SocialProofStrip: two quotes from the same author', () => {
        expectNoKeyWarning(() =>
            render(
                <SocialProofStrip
                    items={[
                        { quote: 'q1', author: 'Ana', position: 'CEO' },
                        { quote: 'q2', author: 'Ana', position: 'CEO' },
                    ]}
                />
            )
        );
    });

    it('ServiceDeliverables: repeated group label and repeated item', () => {
        expectNoKeyWarning(() =>
            render(
                <ServiceDeliverables
                    title="t"
                    price="€1"
                    ctaLabel="Book"
                    ctaHref="/x"
                    groups={[
                        { label: 'Group', items: ['Same', 'Same'] },
                        { label: 'Group', items: ['Other'] },
                    ]}
                />
            )
        );
    });
});
