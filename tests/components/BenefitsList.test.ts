import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import BenefitsList from '@/src/components/services/BenefitsList.astro';

const items = [
    { title: 'Faster launch', description: 'Ship in weeks, not months.' },
    { title: 'Built to convert', description: 'Every page has one job.' },
    { title: 'You own it', description: 'No lock-in, no monthly platform fee.' },
];

describe('BenefitsList', () => {
    it('renders the title and every item', async () => {
        const screen = await renderAstro(BenefitsList, { title: 'Why it works', items });
        expect(screen.getByRole('heading', { name: 'Why it works' })).toBeInTheDocument();
        for (const item of items) {
            expect(screen.getByText(item.title)).toBeInTheDocument();
            expect(screen.getByText(item.description)).toBeInTheDocument();
        }
    });

    it('renders an asymmetric layout: the first item is featured, the rest are not', async () => {
        const screen = await renderAstro(BenefitsList, { title: 'Why it works', items });
        expect(screen.getByTestId('benefit-featured')).toHaveTextContent(items[0].title);
        expect(screen.queryAllByTestId('benefit-featured')).toHaveLength(1);
    });
});
