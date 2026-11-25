import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import PortfolioTypeFilter from '@/src/components/PortfolioTypeFilter.astro';
import { PORTFOLIO_TYPE_COLORS } from '@/lib/portfolio-theme';

/**
 * The chips reuse `portfolio.type.live` / `portfolio.type.demo`, the same keys
 * the card badges render, so this file resolves against the REAL catalogues
 * (`lib/i18n.ts`) rather than an identity translator.
 *
 * Two live and three demo entries, so "narrowed to live" and "narrowed to demo"
 * produce different counts from each other AND from the unfiltered grid.
 *
 * The narrowing itself runs in the component's client script, which the
 * Container API does not execute: this file pins the server-rendered initial
 * state and the data the script reads (Playwright owns the clicks).
 */
const cards = [
    { id: 'masajes-orisha', type: 'live', title: 'Masajes Orisha' },
    { id: 'vicron-lopez', type: 'live', title: 'Vicron Lopez' },
    { id: 'demo-massages', type: 'demo', title: 'Massage Studio Demo' },
    { id: 'real-estate', type: 'demo', title: 'Luxury Real Estate' },
    { id: 'investep-app', type: 'demo', title: 'Investep App' },
] as const;

const slot = cards.map((c) => `<article data-portfolio-type="${c.type}">${c.title}</article>`).join('');

async function renderFilter(locale: 'en' | 'es' = 'en') {
    return renderAstro(PortfolioTypeFilter, { locale, cards: cards.map(({ id, type }) => ({ id, type })) }, { default: slot });
}

describe('PortfolioTypeFilter', () => {
    /**
     * The route is static. Everything a crawler or a no-JS visitor gets is the
     * first render, so the unfiltered grid has to BE that first render.
     */
    it('renders every card before any interaction', async () => {
        const screen = await renderFilter();
        for (const c of cards) {
            expect(screen.getByText(c.title)).toBeInTheDocument();
            expect(screen.getByText(c.title)).not.toHaveAttribute('hidden');
        }
    });

    /**
     * `aria-pressed` is the only thing telling a screen-reader user which filter
     * is active, so exactly one chip is pressed, and initially it is All.
     */
    it('marks exactly the All chip as pressed initially', async () => {
        const screen = await renderFilter();
        const pressed = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true');
        expect(pressed).toHaveLength(1);
        expect(pressed[0].textContent).toMatch(/All Projects/i);
        for (const b of screen.getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed');
    });

    describe('selected chip carries its own category colour', () => {
        /*
         * The script swaps in `data-on` when a chip is selected, so the class a
         * selected live/demo chip will carry is pinned here.
         */
        it('prepares the live and demo chips with their own surface for the selected state', async () => {
            const screen = await renderFilter();
            const live = screen.getByRole('button', { name: /Live Site/i });
            const demo = screen.getByRole('button', { name: /Concept Demo/i });
            expect(live.dataset.on).toContain(PORTFOLIO_TYPE_COLORS.live.surface);
            expect(live.dataset.on).not.toContain(PORTFOLIO_TYPE_COLORS.demo.surface);
            expect(demo.dataset.on).toContain(PORTFOLIO_TYPE_COLORS.demo.surface);
            expect(demo.dataset.on).not.toContain(PORTFOLIO_TYPE_COLORS.live.surface);
        });

        it('leaves an unselected chip uncoloured', async () => {
            const screen = await renderFilter();
            for (const name of [/Live Site/i, /Concept Demo/i]) {
                const chip = screen.getByRole('button', { name });
                for (const color of Object.values(PORTFOLIO_TYPE_COLORS)) {
                    expect(chip.className).not.toContain(color.surface);
                    expect(chip.dataset.off).not.toContain(color.surface);
                }
            }
        });

        /* `all` spans both categories, so it has no category colour to borrow. */
        it('keeps the All chip neutral when selected', async () => {
            const screen = await renderFilter();
            const all = screen.getByRole('button', { name: /All Projects/i });
            expect(all).toHaveAttribute('aria-pressed', 'true');
            expect(all.className).toContain('bg-black');
            for (const color of Object.values(PORTFOLIO_TYPE_COLORS)) {
                expect(all.className).not.toContain(color.surface);
            }
        });
    });

    it('shows how many projects each filter holds', async () => {
        const screen = await renderFilter();
        expect(screen.getByRole('button', { name: /All Projects/i })).toHaveTextContent('5');
        expect(screen.getByRole('button', { name: /Live Site/i })).toHaveTextContent('2');
        expect(screen.getByRole('button', { name: /Concept Demo/i })).toHaveTextContent('3');
    });

    /**
     * The live region is the only feedback a screen-reader user gets after a
     * press, so its content is part of the contract. The script copies each
     * chip's `data-status` into it.
     */
    it('announces the result count in a live region', async () => {
        const screen = await renderFilter();
        expect(screen.getByRole('status')).toHaveTextContent('Showing 5 of 5 projects');
        expect(screen.getByRole('button', { name: /Live Site/i }).dataset.status).toBe('Showing 2 of 5 projects');
        expect(screen.getByRole('button', { name: /Concept Demo/i }).dataset.status).toBe('Showing 3 of 5 projects');
    });

    it('labels the control group for assistive technology', async () => {
        const screen = await renderFilter();
        expect(screen.getByRole('group', { name: /Filter projects by type/i })).toBeInTheDocument();
    });

    it('renders Spanish labels on the Spanish locale', async () => {
        const screen = await renderFilter('es');
        expect(screen.getByRole('button', { name: /Todos los Proyectos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sitio en Vivo/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Demo de Concepto/i })).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Mostrando 5 de 5 proyectos');
    });
});
