import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import SolutionsGrid from '@/src/components/home/SolutionsGrid.astro';

const card = (title: string, extra: Record<string, unknown> = {}) => ({ title, description: `${title} text`, href: `/en/${title}/`, ...extra });
const base = { badge: 'Solutions', title: 'The pieces', subtitle: 'Sub', cta: 'Learn more' };

describe('SolutionsGrid', () => {
    it('shows the badge on its card only, in the dark variant', async () => {
        const screen = await renderAstro(SolutionsGrid, { ...base, items: [card('a'), card('b', { badge: 'New', dark: true })] });
        const links = screen.getAllByRole('link');
        expect(links[0]).not.toHaveTextContent('New');
        expect(links[1]).toHaveTextContent('New');
        expect(links[1].className).toContain('bg-[#0b0f19]');
        expect(screen.getAllByText('New')).toHaveLength(1);
    });

    it('lays five cards out 3 + 2 on wide screens', async () => {
        const screen = await renderAstro(SolutionsGrid, { ...base, items: ['a', 'b', 'c', 'd', 'e'].map((t) => card(t)) });
        const spans = screen.getAllByRole('link').map((a) => a.className.match(/lg:col-span-\d/)?.[0]);
        expect(spans).toEqual(['lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-3', 'lg:col-span-3']);
        expect(screen.body.querySelector('.lg\\:grid-cols-6')).not.toBeNull();
    });
});
