import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import FaqAccordion from '@/src/components/FaqAccordion.astro';

const ITEMS = [
    { question: 'How long does it take?', answer: 'Three months.' },
    { question: 'Is there a contract?', answer: 'No.' },
];

/** Toggling (one open at a time) is client-script behaviour, covered by Playwright. */
describe('FaqAccordion initial state', () => {
    it('renders every question as a collapsed button wired to its answer region', async () => {
        const screen = await renderAstro(FaqAccordion, { items: ITEMS });
        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(2);
        buttons.forEach((button, i) => {
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveAttribute('aria-controls', `faq-answer-${i}`);
            expect(button).toHaveTextContent(ITEMS[i].question);
            const answer = screen.body.querySelector(`#faq-answer-${i}`)!;
            expect(answer).toHaveAttribute('role', 'region');
            expect(answer).toHaveAttribute('aria-labelledby', `faq-question-${i}`);
            expect(answer).toHaveAttribute('hidden');
            expect(answer).toHaveTextContent(ITEMS[i].answer);
        });
    });

    it('starts with the closed styling', async () => {
        const { body } = await renderAstro(FaqAccordion, { items: ITEMS });
        expect(body.querySelector('#faq-question-0')).toHaveClass('text-black');
        expect(body.querySelector('.rotate-0 svg')).toHaveClass('text-gray-950');
        expect(body.querySelector('[data-faq]')).not.toBeNull();
    });
});
