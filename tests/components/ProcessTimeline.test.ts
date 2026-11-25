import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import ProcessTimeline from '@/src/components/services/ProcessTimeline.astro';

const steps = [
    { number: '01', title: 'Book', description: 'Grab 15 minutes on the calendar.' },
    { number: '02', title: 'Meet', description: 'We map the scope together.' },
    { number: '03', title: 'Develop', description: 'We build and keep you posted.' },
    { number: '04', title: 'Deliver', description: 'You launch, we hand it off.' },
];

describe('ProcessTimeline', () => {
    it('renders the title and every step, in order, inside a vertical list', async () => {
        const screen = await renderAstro(ProcessTimeline, { title: 'How it works', steps });
        expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();

        const list = screen.body.querySelector('ol');
        expect(list).not.toBeNull();
        const items = list!.querySelectorAll('li');
        expect(items).toHaveLength(steps.length);
        steps.forEach((step, i) => {
            expect(items[i]).toHaveTextContent(step.number);
            expect(items[i]).toHaveTextContent(step.title);
            expect(items[i]).toHaveTextContent(step.description);
        });
    });

    it('has a DOM shape distinct from BenefitsList (an ordered list, not a grid of divs)', async () => {
        const { body } = await renderAstro(ProcessTimeline, { title: 'How it works', steps });
        expect(body.querySelector('ol')).not.toBeNull();
        expect(body.querySelector('[class*="grid"]')).toBeNull();
    });
});
