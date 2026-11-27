/**
 * What the assistant is told about the home "cost of waiting" calculator: the visitor's own
 * figures in one plain English sentence, or "not used" while it still shows its defaults.
 * The agent reads it as the `cost_of_waiting` dynamic variable and as contextual updates.
 */
import { DEFAULTS, lossFromInputs } from '@/lib/cost-example';

export interface CostOfWaitingInputs {
    missed: number;
    value: number;
}

export function costOfWaitingContext(inputs: CostOfWaitingInputs | null): string {
    if (!inputs || (inputs.missed === DEFAULTS.missed && inputs.value === DEFAULTS.value)) return 'not used';
    const loss = lossFromInputs(inputs.missed, inputs.value);
    if (!loss) return 'not used';
    const eur = (n: number) => `${Math.round(n)} EUR`;
    const customers = `${inputs.missed} customer${inputs.missed === 1 ? '' : 's'}`;
    return `The visitor entered ${customers} lost per working day worth ${inputs.value} EUR each: ${eur(loss.day)} a day, ${eur(loss.week)} a week, ${eur(loss.month)} a month, ${eur(loss.year)} a year.`;
}

/** The calculator's current inputs, or null on a page without it. */
export function readCostOfWaiting(): CostOfWaitingInputs | null {
    const root = document.querySelector('[data-cost-of-waiting]');
    if (!root) return null;
    const input = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.valueAsNumber ?? Number.NaN;
    return { missed: input('missed'), value: input('value') };
}

/**
 * The `calculate_cost_of_waiting` client tool: the agent never does this arithmetic itself,
 * so what it says matches the calculator to the euro. Inputs arrive as the LLM sends them
 * (numbers or numeric text); anything not positive is refused instead of guessed.
 */
export function costEstimate(customersPerDay: unknown, valuePerCustomer: unknown): string {
    const missed = Number(customersPerDay);
    const value = Number(valuePerCustomer);
    const loss = lossFromInputs(missed, value);
    if (!loss) return `Cannot calculate: customers_per_day and value_per_customer must be positive numbers (got ${String(customersPerDay)} and ${String(valuePerCustomer)}).`;
    const eur = (n: number) => `${Math.round(n)} EUR`;
    const customers = `${missed} customer${missed === 1 ? '' : 's'}`;
    return `${customers} lost per working day worth ${value} EUR each: ${eur(loss.day)} a day, ${eur(loss.week)} a week, ${eur(loss.month)} a month, ${eur(loss.year)} a year (5 working days a week, 52 weeks a year, first visits only).`;
}
