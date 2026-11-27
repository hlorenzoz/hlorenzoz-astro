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
