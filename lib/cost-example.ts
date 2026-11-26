/**
 * The arithmetic behind the home "cost of waiting" calculator and the dental
 * clinic example. No copy lives here: labels are in `messages/<locale>.json`
 * under `home.costOfWaiting`.
 *
 * The amounts below are market prices of a CLIENT industry (what patients pay a
 * dental clinic in Spain), used only to illustrate the arithmetic. They are not
 * the agency's prices: the agency publishes none (see AGENTS.md, "How we work").
 */

/** Median amounts (EUR) patients reported paying in Spain, OCU dental survey 2024. */
export const DENTAL_MEDIANS = [
    { key: 'cleaning', amount: 60 },
    { key: 'filling', amount: 80 },
    { key: 'rootCanal', amount: 250 },
    { key: 'implant', amount: 1850 },
    { key: 'orthodontics', amount: 2000 },
] as const;

export const OCU_SOURCE = {
    url: 'https://www.ocu.org/organizacion/prensa/notas-de-prensa/2024/saluddental271124',
    published: '2024-11-27',
} as const;

/** What both calculators show before the visitor types anything. */
export const DEFAULTS = { missed: 1, value: 140 } as const;

export const DAYS_PER_WEEK = 5;
export const WEEKS_PER_YEAR = 52;

/** What a daily loss adds up to, counting working days only. */
export function lossPerPeriod(perDay: number) {
    const week = perDay * DAYS_PER_WEEK;
    return { day: perDay, week, month: (week * WEEKS_PER_YEAR) / 12, year: week * WEEKS_PER_YEAR };
}

const positive = (n: number) => Number.isFinite(n) && n > 0;

/** The loss for customers missed a day at a given first visit value; null when an input is empty, zero or invalid. */
export function lossFromInputs(missed: number, value: number) {
    return positive(missed) && positive(value) ? lossPerPeriod(missed * value) : null;
}

/** Whole euros in the reader's number format (`localeInfo(locale).intl`), on the server and in the browser alike. */
export function euroFormatter(intlLocale: string) {
    return new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}
