import { describe, it, expect } from 'vitest';
import { within } from '@testing-library/dom';
import { renderAstro } from '@/tests/helpers/render';
import CostComparison from '@/src/components/numbers/CostComparison.astro';
import MissedCustomerTable from '@/src/components/numbers/MissedCustomerTable.astro';

const comparison = {
    separateTitle: 'Bought separately',
    rows: [
        { label: 'Local SEO', value: '€897' },
        { label: 'Review management', value: '€297' },
        { label: 'Authority content' },
        { label: 'Backlinks and citations' },
    ],
    perMonth: '/ month',
    unpricedLabel: 'extra',
    totalLabel: 'Just two of the four',
    total: '€1,194',
    note: 'List prices at which we offered these two services on their own.',
    planTitle: 'In a single plan',
    planPrice: '€750',
    includedLabel: 'All four pillars included',
    saving: '37% less than two of the pillars bought separately.',
    tax: '+ VAT',
};

describe('CostComparison', () => {
    it('prices the two pillars that had a list price and marks the others as extra', async () => {
        const screen = await renderAstro(CostComparison, comparison);
        const rows = screen.getAllByTestId('ledger-row');
        expect(rows).toHaveLength(4);
        expect(rows[0]).toHaveTextContent('€897');
        expect(rows[2]).toHaveTextContent('extra');
        // No invented figure for a pillar that never had a published price.
        expect(rows[2].textContent).not.toMatch(/€/);
    });

    it('marks every quoted figure as before tax: two rows, the total and the plan', async () => {
        const screen = await renderAstro(CostComparison, comparison);
        expect(screen.getAllByTestId('tax-mark')).toHaveLength(4);
        expect(within(screen.getByTestId('plan-price')).getByTestId('tax-mark')).toBeInTheDocument();
    });

    it('states the total, the plan price and the saving', async () => {
        const screen = await renderAstro(CostComparison, comparison);
        expect(screen.getByTestId('ledger-total')).toHaveTextContent('€1,194');
        expect(screen.getByTestId('plan-price')).toHaveTextContent('€750');
        expect(screen.getByText(/37% less/)).toBeInTheDocument();
    });
});

const table = {
    title: 'What a customer who never arrives costs',
    description: 'The plan costs €9,000 + VAT a year.',
    columns: { value: 'If a new customer brings in, per year', cover: 'The plan is paid for by', missed: 'One customer fewer a month costs you, per year' },
    rows: [
        { value: '€250', cover: '3 customers a month', missed: '€3,000' },
        { value: '€2,500', cover: '1 customer every 3 months', missed: '€30,000' },
    ],
    footnote: 'Illustrative example with assumed customer values.',
};

describe('MissedCustomerTable', () => {
    it('is a real table with a header row, so the columns are announced', async () => {
        const screen = await renderAstro(MissedCustomerTable, table);
        expect(screen.getAllByRole('columnheader')).toHaveLength(3);
        expect(screen.getAllByRole('row')).toHaveLength(3);
    });

    it('renders each worked example', async () => {
        const screen = await renderAstro(MissedCustomerTable, table);
        expect(screen.getByText('3 customers a month')).toBeInTheDocument();
        expect(screen.getByText('€30,000')).toBeInTheDocument();
    });

    it('always shows the note that the values are an example', async () => {
        // The figures are illustrative inputs. Shown without the note they read
        // as results the agency claims.
        const screen = await renderAstro(MissedCustomerTable, table);
        expect(screen.getByTestId('missed-footnote')).toHaveTextContent('Illustrative example');
    });
});
