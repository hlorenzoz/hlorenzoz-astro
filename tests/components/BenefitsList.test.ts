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

    it('numbers the items 01, 02, 03 by default, each with an h3', async () => {
        const screen = await renderAstro(BenefitsList, { title: 'Why it works', items });
        expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(items.map((i) => i.title));
        expect(screen.getByText('01')).toBeInTheDocument();
        expect(screen.getByText('03')).toBeInTheDocument();
    });

    it('renders the eyebrow and subtitle, and drops the numbers when asked', async () => {
        const screen = await renderAstro(BenefitsList, { title: 'Why it works', items, eyebrow: 'What it does', subtitle: 'Every call answered.', numbered: false });
        expect(screen.getByText('What it does')).toBeInTheDocument();
        expect(screen.getByText('Every call answered.')).toBeInTheDocument();
        expect(screen.queryByText('01')).toBeNull();
    });

    it('takes an id so the hero can link to it', async () => {
        const { body } = await renderAstro(BenefitsList, { title: 'Why it works', items, id: 'pillars' });
        expect(body.querySelector('section#pillars')).not.toBeNull();
    });
});
