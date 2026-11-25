/**
 * The two "numbers" blocks: what the work would cost bought separately, and
 * what a customer who never arrives costs.
 *
 * They are shown on the home page and on the Local SEO page, and the dossier
 * prints the same ones. Building their props here, from `lib/pricing.ts` and
 * the shared `numbers.*` messages, is what keeps the three in step: there is
 * one place the arithmetic happens and one place the wording lives.
 */
import {
    EXAMPLE_CUSTOMER_VALUES,
    FORMER_STANDALONE,
    PRICING,
    coverage,
    formatAmount,
} from '@/lib/pricing';

export interface CostComparisonProps {
    separateTitle: string;
    /**
     * One row per pillar. `value` is set only for the pillars the agency once
     * sold on their own, at their former list price. The others get the
     * `unpricedLabel`: no figure is invented for something that never had one.
     */
    rows: { label: string; value?: string }[];
    perMonth: string;
    unpricedLabel: string;
    totalLabel: string;
    total: string;
    note: string;
    planTitle: string;
    planPrice: string;
    includedLabel: string;
    saving: string;
    tax: string;
}

export interface MissedCustomerTableProps {
    title: string;
    description: string;
    columns: { value: string; cover: string; missed: string };
    /** Worked examples, already formatted. Illustrative inputs, not results. */
    rows: { value: string; cover: string; missed: string }[];
    /** States that the values are an example. Always rendered. */
    footnote: string;
}

/** A ROOT translator: keys are full paths such as `numbers.plan.title`. */
type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The pillars in the order `numbers.separate.items` lists them, each with the
 * price it once had on its own, if it had one. Content and backlinks were
 * quoted per client: they have no figure, and none is invented for them.
 */
const SEPARATE_ROWS: readonly (number | null)[] = [
    FORMER_STANDALONE.localSeo,
    FORMER_STANDALONE.reviewManagement,
    null,
    null,
];

export function costComparison(locale: string, t: Translate, tax: string): CostComparisonProps {
    const plan = PRICING.localSeo.base.amount;
    const total = SEPARATE_ROWS.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
    const saving = Math.round((1 - plan / total) * 100);

    return {
        separateTitle: t('numbers.separate.title'),
        rows: SEPARATE_ROWS.map((amount, index) => ({
            label: t(`numbers.separate.items.${index}`),
            ...(amount === null ? {} : { value: formatAmount(amount, locale) }),
        })),
        perMonth: t('numbers.perMonth'),
        unpricedLabel: t('numbers.separate.unpriced'),
        totalLabel: t('numbers.separate.totalLabel'),
        total: formatAmount(total, locale),
        note: t('numbers.separate.note'),
        planTitle: t('numbers.plan.title'),
        planPrice: formatAmount(plan, locale),
        includedLabel: t('numbers.plan.includedLabel'),
        saving: t('numbers.plan.saving', { saving }),
        tax,
    };
}

export function missedCustomerTable(locale: string, t: Translate, tax: string): MissedCustomerTableProps {
    const plan = PRICING.localSeo.base.amount;

    const coverLabel = (customerValue: number): string => {
        const { clients, months } = coverage(plan, customerValue);
        if (clients > 1) return t('numbers.missed.coverClients', { count: clients });
        if (months > 1) return t('numbers.missed.coverMonths', { months });
        return t('numbers.missed.coverOne');
    };

    return {
        title: t('numbers.missed.title'),
        description: t('numbers.missed.description', { annual: formatAmount(plan * 12, locale), tax }),
        columns: {
            value: t('numbers.missed.columns.value'),
            cover: t('numbers.missed.columns.cover'),
            missed: t('numbers.missed.columns.missed'),
        },
        rows: EXAMPLE_CUSTOMER_VALUES.map((customerValue) => ({
            value: formatAmount(customerValue, locale),
            cover: coverLabel(customerValue),
            // One customer fewer every month, over a year.
            missed: formatAmount(customerValue * 12, locale),
        })),
        footnote: t('numbers.missed.footnote'),
    };
}
