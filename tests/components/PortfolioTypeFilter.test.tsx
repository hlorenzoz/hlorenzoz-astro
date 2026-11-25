import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import {
    PortfolioTypeFilter,
    type PortfolioFilterCard,
} from '@/components/PortfolioTypeFilter';
import { PORTFOLIO_TYPE_COLORS } from '@/lib/portfolio-theme';

vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(actual as any),
        Globe: () => <div data-testid="icon-globe" />,
        Layout: () => <div data-testid="icon-layout" />,
        Layers: () => <div data-testid="icon-layers" />,
    };
});

/**
 * `vitest.setup.ts` mocks next-intl with an IDENTITY translator: `t('x')`
 * returns `"x"`. That is deliberate for most components, where asserting the
 * key path proves which message a component asked for.
 *
 * It cannot work here. This component's labels are the contract: the chips
 * reuse `portfolio.type.live` / `portfolio.type.demo`, the same keys the card
 * badges render, so "the filter says what the badge says" is the thing worth
 * locking. Under the identity mock every locale renders the same key path, so
 * the Spanish assertion below would pass on an English-only build, and the
 * interpolated live region would collapse to a bare key and never prove it
 * counts anything.
 *
 * So this file resolves against the REAL catalogues. It is a narrow
 * re-implementation: namespace lookup plus `{param}` substitution, which is the
 * whole of what this component uses.
 */
vi.mock('next-intl', async () => {
    const React = await import('react');
    const MessagesContext = React.createContext<Record<string, unknown>>({});

    const lookup = (messages: unknown, path: string) =>
        path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], messages);

    return {
        useLocale: () => 'en',
        NextIntlClientProvider: ({
            messages,
            children,
        }: {
            messages: Record<string, unknown>;
            children: React.ReactNode;
        }) => React.createElement(MessagesContext.Provider, { value: messages }, children),
        useTranslations: (namespace?: string) => {
            const messages = React.useContext(MessagesContext);
            const resolve = (key: string) => (namespace ? `${namespace}.${key}` : key);

            const t = (key: string, values?: Record<string, unknown>) => {
                const message = lookup(messages, resolve(key));
                if (typeof message !== 'string') return resolve(key);
                if (!values) return message;
                return message.replace(/\{(\w+)\}/g, (_match, name: string) =>
                    name in values ? String(values[name]) : `{${name}}`
                );
            };
            t.rich = t;
            t.raw = (key: string) => lookup(messages, resolve(key));
            t.has = (key: string) => lookup(messages, resolve(key)) !== undefined;
            return t;
        },
    };
});

/**
 * Two live and three demo entries, so "narrowed to live" and "narrowed to demo"
 * produce different counts from each other AND from the unfiltered grid. Equal
 * group sizes would let an off-by-one filter pass.
 */
const cards: PortfolioFilterCard[] = [
    { id: 'masajes-orisha', type: 'live', card: <article key="a">Masajes Orisha</article> },
    { id: 'vicron-lopez', type: 'live', card: <article key="b">Vicron Lopez</article> },
    { id: 'demo-massages', type: 'demo', card: <article key="c">Massage Studio Demo</article> },
    { id: 'real-estate', type: 'demo', card: <article key="d">Luxury Real Estate</article> },
    { id: 'investep-app', type: 'demo', card: <article key="e">Investep App</article> },
];

const LIVE = ['Masajes Orisha', 'Vicron Lopez'];
const DEMO = ['Massage Studio Demo', 'Luxury Real Estate', 'Investep App'];

function renderFilter(locale: 'en' | 'es' = 'en') {
    return render(
        <NextIntlClientProvider locale={locale} messages={locale === 'en' ? en : es}>
            <PortfolioTypeFilter cards={cards} />
        </NextIntlClientProvider>
    );
}

const chip = (name: RegExp) => screen.getByRole('button', { name });

describe('PortfolioTypeFilter', () => {
    /**
     * The route is `force-static`. Everything a crawler or a no-JS visitor gets
     * is the first render, so the unfiltered grid has to BE that first render.
     * A filter that defaulted to anything else would silently drop projects from
     * the shipped HTML, and from the CollectionPage schema's own claim about the
     * page.
     */
    it('renders every card before any interaction', () => {
        renderFilter();
        for (const title of [...LIVE, ...DEMO]) {
            expect(screen.getByText(title)).toBeInTheDocument();
        }
    });

    /**
     * Filtering unmounts and remounts cards, so React needs a stable key per
     * card across those transitions. The component owns that key (from `id`)
     * rather than trusting the caller to have put one on the element it built:
     * a missing key degrades reconciliation and only ever surfaces as a console
     * warning, which no assertion elsewhere would catch.
     *
     * Cards deliberately carry NO `key` of their own here, so this fails if the
     * component ever goes back to rendering `c.card` bare.
     */
    it('keys cards itself instead of relying on the caller', async () => {
        const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
        const user = userEvent.setup();

        render(
            <NextIntlClientProvider locale="en" messages={en}>
                <PortfolioTypeFilter
                    cards={cards.map(({ id, type }) => ({
                        id,
                        type,
                        card: <article>{id}</article>,
                    }))}
                />
            </NextIntlClientProvider>
        );
        await user.click(chip(/Live Site/i));

        const keyWarnings = warn.mock.calls.filter((args) => String(args[0]).includes('unique "key"'));
        expect(keyWarnings, 'React warned about missing keys').toEqual([]);
        warn.mockRestore();
    });

    it('narrows to live projects only', async () => {
        const user = userEvent.setup();
        renderFilter();

        await user.click(chip(/Live Site/i));

        for (const title of LIVE) expect(screen.getByText(title)).toBeInTheDocument();
        for (const title of DEMO) expect(screen.queryByText(title)).not.toBeInTheDocument();
    });

    it('narrows to demo projects only', async () => {
        const user = userEvent.setup();
        renderFilter();

        await user.click(chip(/Concept Demo/i));

        for (const title of DEMO) expect(screen.getByText(title)).toBeInTheDocument();
        for (const title of LIVE) expect(screen.queryByText(title)).not.toBeInTheDocument();
    });

    it('restores the full grid when returning to All', async () => {
        const user = userEvent.setup();
        renderFilter();

        await user.click(chip(/Live Site/i));
        await user.click(chip(/All Projects/i));

        for (const title of [...LIVE, ...DEMO]) {
            expect(screen.getByText(title)).toBeInTheDocument();
        }
    });

    /**
     * `aria-pressed` is the only thing telling a screen-reader user which filter
     * is active: the visual state is a background colour, which carries no
     * semantics. Exactly one chip must be pressed at a time, so a stale `true`
     * cannot claim two active filters.
     */
    it('marks exactly the active chip as pressed', async () => {
        const user = userEvent.setup();
        renderFilter();

        const pressed = () =>
            screen
                .getAllByRole('button')
                .filter((b) => b.getAttribute('aria-pressed') === 'true')
                .map((b) => b.textContent);

        expect(pressed()).toHaveLength(1);
        expect(pressed()[0]).toMatch(/All Projects/i);

        await user.click(chip(/Concept Demo/i));

        expect(pressed()).toHaveLength(1);
        expect(pressed()[0]).toMatch(/Concept Demo/i);
    });

    /**
     * The colours are a legend, not decoration: the selected chip means "live"
     * because it is the same green that badges every live card. Highlighting in a
     * neutral colour, or swapping the two, breaks the association the whole
     * control depends on, and neither shows up as a broken test elsewhere.
     */
    describe('selected chip carries its own category colour', () => {
        it('paints the live chip with the live surface', async () => {
            const user = userEvent.setup();
            renderFilter();

            await user.click(chip(/Live Site/i));
            expect(chip(/Live Site/i).className).toContain(PORTFOLIO_TYPE_COLORS.live.surface);
            expect(chip(/Live Site/i).className).not.toContain(PORTFOLIO_TYPE_COLORS.demo.surface);
        });

        it('paints the demo chip with the demo surface', async () => {
            const user = userEvent.setup();
            renderFilter();

            await user.click(chip(/Concept Demo/i));
            expect(chip(/Concept Demo/i).className).toContain(PORTFOLIO_TYPE_COLORS.demo.surface);
            expect(chip(/Concept Demo/i).className).not.toContain(PORTFOLIO_TYPE_COLORS.live.surface);
        });

        it('leaves an unselected chip uncoloured', () => {
            renderFilter();
            for (const color of Object.values(PORTFOLIO_TYPE_COLORS)) {
                expect(chip(/Live Site/i).className).not.toContain(color.surface);
                expect(chip(/Concept Demo/i).className).not.toContain(color.surface);
            }
        });

        /*
         * `all` spans both categories, so it has no category colour to borrow.
         * Giving it one would assert a meaning it does not have.
         */
        it('keeps the All chip neutral when selected', () => {
            renderFilter();
            const all = chip(/All Projects/i);
            expect(all).toHaveAttribute('aria-pressed', 'true');
            expect(all.className).toContain('bg-black');
            for (const color of Object.values(PORTFOLIO_TYPE_COLORS)) {
                expect(all.className).not.toContain(color.surface);
            }
        });
    });

    it('shows how many projects each filter holds', () => {
        renderFilter();

        expect(chip(/All Projects/i)).toHaveTextContent('5');
        expect(chip(/Live Site/i)).toHaveTextContent('2');
        expect(chip(/Concept Demo/i)).toHaveTextContent('3');
    });

    /**
     * Narrowing the grid changes the page without moving focus, so the button
     * press alone tells a screen-reader user nothing about the result. The live
     * region is the feedback, which makes its CONTENT part of the contract, not
     * just its presence.
     */
    it('announces the result count in a live region', async () => {
        const user = userEvent.setup();
        renderFilter();

        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('Showing 5 of 5 projects');

        await user.click(chip(/Live Site/i));
        expect(status).toHaveTextContent('Showing 2 of 5 projects');
    });

    it('labels the control group for assistive technology', () => {
        renderFilter();
        expect(screen.getByRole('group', { name: /Filter projects by type/i })).toBeInTheDocument();
    });

    /**
     * The chips reuse `portfolio.type.*`, the same keys the card badges render,
     * so a filter labelled in English on the Spanish page would mean those keys
     * had been bypassed rather than merely mistranslated.
     */
    it('renders Spanish labels on the Spanish locale', () => {
        renderFilter('es');

        expect(screen.getByRole('button', { name: /Todos los Proyectos/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sitio en Vivo/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Demo de Concepto/i })).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Mostrando 5 de 5 proyectos');
    });
});
